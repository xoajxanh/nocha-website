import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInitialSeed } from '@/lib/db';

function parseStartDate(dateStr: string | null, fallback: Date): Date {
  if (!dateStr) return fallback;
  const d = new Date(`${dateStr}T00:00:00.000+07:00`);
  return isNaN(d.getTime()) ? fallback : d;
}

function parseEndDate(dateStr: string | null, fallback: Date): Date {
  if (!dateStr) return fallback;
  const d = new Date(`${dateStr}T23:59:59.999+07:00`);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const now = new Date();
  const defaultStartOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Global staff filter (for Admin; Staff is always locked to their own userId)
  const globalStaffParam = searchParams.get('staffId') || 'ALL';
  const resolveStaffId = (cardStaffParam: string | null) => {
    if (session.role !== 'ADMIN') {
      return session.userId;
    }
    const candidate = cardStaffParam || globalStaffParam;
    return candidate && candidate !== 'ALL' ? candidate : null;
  };

  // 1. Revenue Card Filters
  const revFrom = parseStartDate(searchParams.get('revFrom'), defaultStartOfMonth);
  const revTo = parseEndDate(searchParams.get('revTo'), defaultEndOfMonth);
  const revStaffId = resolveStaffId(searchParams.get('revStaffId'));

  // 2. Order Card Filters
  const ordFrom = parseStartDate(searchParams.get('ordFrom'), defaultStartOfMonth);
  const ordTo = parseEndDate(searchParams.get('ordTo'), defaultEndOfMonth);
  const ordStaffId = resolveStaffId(searchParams.get('ordStaffId'));

  // 3. Monthly Chart Filters (Year + Staff)
  const chartYear = Number(searchParams.get('year')) || now.getFullYear();
  const chartStaffId = resolveStaffId(searchParams.get('chartStaffId'));

  // 4. Product Charts Filters (From - To + Staff)
  const prodFrom = parseStartDate(searchParams.get('prodFrom'), defaultStartOfMonth);
  const prodTo = parseEndDate(searchParams.get('prodTo'), defaultEndOfMonth);
  const prodStaffId = resolveStaffId(searchParams.get('prodStaffId'));

  // Fetch all orders once (filtered to staff if user is STAFF, or all for ADMIN) so we can compute fast in-memory aggregations
  const baseWhere: any = {};
  if (session.role !== 'ADMIN') {
    baseWhere.createdById = session.userId;
  }

  const allOrders = await prisma.order.findMany({
    where: baseWhere,
    include: {
      items: true,
      createdBy: {
        select: { id: true, username: true, displayName: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // --- Card 1: Revenue Stats (Only COMPLETED orders, netRevenue excludes shippingFee) ---
  const filteredRevOrders = allOrders.filter((o) => {
    const dt = new Date(o.createdAt);
    const matchStaff = !revStaffId || o.createdById === revStaffId;
    return o.status === 'COMPLETED' && matchStaff && dt >= revFrom && dt <= revTo;
  });
  const periodRevenue = filteredRevOrders.reduce((sum, o) => sum + (o.netRevenue || 0), 0);

  // Total system revenue (all-time completed revenue respecting staff permission/selection)
  const systemRevOrders = allOrders.filter((o) => {
    const matchStaff = !revStaffId || o.createdById === revStaffId;
    return o.status === 'COMPLETED' && matchStaff;
  });
  const totalSystemRevenue = systemRevOrders.reduce((sum, o) => sum + (o.netRevenue || 0), 0);
  const allSystemTotalRevenue = allOrders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.netRevenue || 0), 0);

  // --- Card 2: Order Count Stats ---
  const filteredOrdOrders = allOrders.filter((o) => {
    const dt = new Date(o.createdAt);
    const matchStaff = !ordStaffId || o.createdById === ordStaffId;
    return matchStaff && dt >= ordFrom && dt <= ordTo;
  });
  const periodOrderCount = filteredOrdOrders.length;
  const periodCompletedOrders = filteredOrdOrders.filter((o) => o.status === 'COMPLETED').length;
  const periodShippingOrders = filteredOrdOrders.filter((o) => o.status === 'SHIPPING').length;
  const periodCreatedOrders = filteredOrdOrders.filter((o) => o.status === 'CREATED').length;
  const periodCancelledOrders = filteredOrdOrders.filter((o) => o.status === 'CANCELLED').length;

  const systemOrdOrders = allOrders.filter((o) => !ordStaffId || o.createdById === ordStaffId);
  const totalSystemOrders = systemOrdOrders.length;
  const allSystemTotalOrders = allOrders.length;

  // --- Monthly Combined Bar (Revenue) + Line (Orders) Chart for 12 Months ---
  const monthlyChartData = Array.from({ length: 12 }, (_, idx) => {
    const monthIndex = idx; // 0..11
    const monthOrders = allOrders.filter((o) => {
      const dt = new Date(o.createdAt);
      const matchStaff = !chartStaffId || o.createdById === chartStaffId;
      return matchStaff && dt.getFullYear() === chartYear && dt.getMonth() === monthIndex;
    });

    const completedMonthOrders = monthOrders.filter((o) => o.status === 'COMPLETED');
    const revenue = completedMonthOrders.reduce((sum, o) => sum + (o.netRevenue || 0), 0);

    return {
      month: `Thg ${idx + 1}`,
      monthNumber: idx + 1,
      revenue,
      orders: monthOrders.length,
      completedOrders: completedMonthOrders.length,
    };
  });

  // --- Top Products Charts (1: By Quantity Sold, 2: By Net Revenue) ---
  const prodOrders = allOrders.filter((o) => {
    const dt = new Date(o.createdAt);
    const matchStaff = !prodStaffId || o.createdById === prodStaffId;
    return o.status === 'COMPLETED' && matchStaff && dt >= prodFrom && dt <= prodTo;
  });

  const productStatsMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      productImage: string | null;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
    }
  >();

  for (const ord of prodOrders) {
    // Allocate order-level discount proportionally across items so product revenue sums to netRevenue (excluding shipping)
    const ratio =
      ord.subtotalAmount > 0 ? Math.max(0, ord.netRevenue / ord.subtotalAmount) : 1;

    for (const item of ord.items) {
      const key = item.productId || item.productName;
      const existing = productStatsMap.get(key) || {
        productId: key,
        productName: item.productName,
        productImage: item.productImage,
        totalQuantity: 0,
        totalRevenue: 0,
        orderCount: 0,
      };

      const itemNetRevenue = Math.round((item.lineTotal || 0) * ratio);
      existing.totalQuantity += item.quantity || 0;
      existing.totalRevenue += itemNetRevenue;
      existing.orderCount += 1;

      productStatsMap.set(key, existing);
    }
  }

  const allProductStats = Array.from(productStatsMap.values());
  const topProductsByQuantity = [...allProductStats]
    .sort((a, b) => b.totalQuantity - a.totalQuantity || b.totalRevenue - a.totalRevenue)
    .slice(0, 8);

  const topProductsByRevenue = [...allProductStats]
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalQuantity - a.totalQuantity)
    .slice(0, 8);

  // Staff list & performance breakdown for Admin
  let staffList: any[] = [];
  let staffStats: any[] = [];

  if (session.role === 'ADMIN') {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isLocked: true,
      },
    });
    staffList = users;

    staffStats = users.map((u) => {
      const userOrders = allOrders.filter((o) => o.createdById === u.id);
      const userPeriodOrders = userOrders.filter((o) => {
        const dt = new Date(o.createdAt);
        return dt >= revFrom && dt <= revTo;
      });
      const userPeriodCompleted = userPeriodOrders.filter((o) => o.status === 'COMPLETED');
      const userAllCompleted = userOrders.filter((o) => o.status === 'COMPLETED');

      return {
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        isLocked: u.isLocked,
        periodOrders: userPeriodOrders.length,
        periodRevenue: userPeriodCompleted.reduce((s, o) => s + (o.netRevenue || 0), 0),
        totalOrders: userOrders.length,
        totalRevenue: userAllCompleted.reduce((s, o) => s + (o.netRevenue || 0), 0),
      };
    });
  }

  return NextResponse.json({
    revenueCard: {
      periodRevenue,
      totalSystemRevenue,
      allSystemTotalRevenue,
      completedOrderCount: filteredRevOrders.length,
    },
    orderCard: {
      periodOrderCount,
      periodCompletedOrders,
      periodShippingOrders,
      periodCreatedOrders,
      periodCancelledOrders,
      totalSystemOrders,
      allSystemTotalOrders,
    },
    monthlyChartData,
    topProductsByQuantity,
    topProductsByRevenue,
    staffList,
    staffStats,
    recentOrders: allOrders
      .filter((o) => !revStaffId || o.createdById === revStaffId)
      .slice(0, 6),
  });
}

