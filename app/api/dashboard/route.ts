import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  getActiveUserSession,
  ensureInitialSeed,
  ensureInventoryTables,
} from '@/lib/db';

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
  await ensureInventoryTables();
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

  // 2b. Net Profit Card Filters (Thu - Chi, Admin)
  const netFrom = parseStartDate(searchParams.get('netFrom'), defaultStartOfMonth);
  const netTo = parseEndDate(searchParams.get('netTo'), defaultEndOfMonth);

  // 3a. Daily Revenue & Order Chart Filters (Month + Year + Staff)
  const dailyMonth = Math.min(
    12,
    Math.max(1, Number(searchParams.get('dailyMonth')) || now.getMonth() + 1)
  );
  const dailyYear = Number(searchParams.get('dailyYear')) || now.getFullYear();
  const dailyStaffId = resolveStaffId(searchParams.get('dailyStaffId'));

  // 3b. Monthly Revenue & Order Chart Filters (Year + Staff)
  const chartYear = Number(searchParams.get('year')) || now.getFullYear();
  const chartStaffId = resolveStaffId(searchParams.get('chartStaffId'));

  // 4. Product Charts Filters (From - To + Staff)
  const prodFrom = parseStartDate(searchParams.get('prodFrom'), defaultStartOfMonth);
  const prodTo = parseEndDate(searchParams.get('prodTo'), defaultEndOfMonth);
  const prodStaffId = resolveStaffId(searchParams.get('prodStaffId'));

  // 5. Inventory / Input Cost Analytics Filters (Admin)
  const expDailyMonth = Math.min(
    12,
    Math.max(1, Number(searchParams.get('expDailyMonth')) || now.getMonth() + 1)
  );
  const expDailyYear = Number(searchParams.get('expDailyYear')) || now.getFullYear();
  const expDailyCatId = searchParams.get('expDailyCatId') || 'ALL';

  const expMonthlyYear = Number(searchParams.get('expMonthlyYear')) || now.getFullYear();
  const expMonthlyCatId = searchParams.get('expMonthlyCatId') || 'ALL';

  const expTopFrom = parseStartDate(searchParams.get('expTopFrom'), defaultStartOfMonth);
  const expTopTo = parseEndDate(searchParams.get('expTopTo'), defaultEndOfMonth);
  const expTopCatId = searchParams.get('expTopCatId') || 'ALL';

  // Fetch all orders once (filtered to staff if user is STAFF, or all for ADMIN)
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

  // --- Daily Combined Bar (Revenue) + Line (Orders) Chart for Selected Month & Year ---
  const daysInDailyMonth = new Date(dailyYear, dailyMonth, 0).getDate();
  const dailyChartData = Array.from({ length: daysInDailyMonth }, (_, idx) => {
    const dayNum = idx + 1;
    const dayOrders = allOrders.filter((o) => {
      const dt = new Date(o.createdAt);
      const matchStaff = !dailyStaffId || o.createdById === dailyStaffId;
      return (
        matchStaff &&
        dt.getFullYear() === dailyYear &&
        dt.getMonth() === dailyMonth - 1 &&
        dt.getDate() === dayNum
      );
    });

    const completedDayOrders = dayOrders.filter((o) => o.status === 'COMPLETED');
    const revenue = completedDayOrders.reduce((sum, o) => sum + (o.netRevenue || 0), 0);

    return {
      day: String(dayNum).padStart(2, '0'),
      dayNumber: dayNum,
      revenue,
      orders: dayOrders.length,
      completedOrders: completedDayOrders.length,
    };
  });

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

  // Staff list, performance breakdown & Inventory Input Cost Analytics for Admin
  let staffList: any[] = [];
  let staffStats: any[] = [];
  let netProfitCard = {
    periodRevenue: 0,
    periodExpense: 0,
    periodNetProfit: 0,
    periodEntryCount: 0,
    allTimeRevenue: 0,
    allTimeExpense: 0,
    allTimeNetProfit: 0,
  };
  let inventoryAnalytics: any = {
    categories: [],
    dailyExpenseChart: [],
    monthlyExpenseChart: [],
    topExpenseItems: [],
    totalTopPeriodExpense: 0,
  };

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

    // Fetch Inventory Categories & Entries for Admin Input Cost Analytics
    const invCategories = await prisma.$queryRaw<
      Array<{ id: string; name: string }>
    >`
      SELECT [id], [name]
      FROM [dbo].[InventoryCategory]
      WHERE [isDeleted] = 0
      ORDER BY [sortOrder] ASC, [createdAt] ASC
    `;

    const invEntries = await prisma.$queryRaw<
      Array<{
        id: string;
        itemId: string;
        itemName: string;
        categoryId: string;
        categoryName: string;
        unit: string;
        quantity: number;
        calculatedAmount: number;
        adjustedAmount: number;
        entryDate: Date;
      }>
    >`
      SELECT
        [id],
        [itemId],
        [itemName],
        [categoryId],
        [categoryName],
        [unit],
        [quantity],
        [calculatedAmount],
        [adjustedAmount],
        [entryDate]
      FROM [dbo].[InventoryEntry]
    `;

    // 1. Net Profit Card (Thu - Chi)
    const netRevOrders = allOrders.filter((o) => {
      const dt = new Date(o.createdAt);
      return o.status === 'COMPLETED' && dt >= netFrom && dt <= netTo;
    });
    const netPeriodRevenue = netRevOrders.reduce((s, o) => s + (o.netRevenue || 0), 0);

    const netPeriodEntries = invEntries.filter((e) => {
      const dt = new Date(e.entryDate);
      return dt >= netFrom && dt <= netTo;
    });
    const netPeriodExpense = netPeriodEntries.reduce(
      (s, e) => s + Number(e.adjustedAmount || 0),
      0
    );

    const allTimeExpense = invEntries.reduce(
      (s, e) => s + Number(e.adjustedAmount || 0),
      0
    );

    netProfitCard = {
      periodRevenue: netPeriodRevenue,
      periodExpense: netPeriodExpense,
      periodNetProfit: netPeriodRevenue - netPeriodExpense,
      periodEntryCount: netPeriodEntries.length,
      allTimeRevenue: allSystemTotalRevenue,
      allTimeExpense,
      allTimeNetProfit: allSystemTotalRevenue - allTimeExpense,
    };

    // 2. Daily Expense Line Chart (by expDailyMonth, expDailyYear, expDailyCatId)
    const daysInExpMonth = new Date(expDailyYear, expDailyMonth, 0).getDate();
    const dailyExpenseChart = Array.from({ length: daysInExpMonth }, (_, idx) => {
      const dayNum = idx + 1;
      const dayEntries = invEntries.filter((e) => {
        const dt = new Date(e.entryDate);
        const matchCat = expDailyCatId === 'ALL' || e.categoryId === expDailyCatId;
        return (
          matchCat &&
          dt.getFullYear() === expDailyYear &&
          dt.getMonth() === expDailyMonth - 1 &&
          dt.getDate() === dayNum
        );
      });

      const cost = dayEntries.reduce((s, e) => s + Number(e.adjustedAmount || 0), 0);
      return {
        day: String(dayNum).padStart(2, '0'),
        dayNumber: dayNum,
        cost,
        entryCount: dayEntries.length,
      };
    });

    // 3. Monthly Expense Line Chart (by expMonthlyYear, expMonthlyCatId)
    const monthlyExpenseChart = Array.from({ length: 12 }, (_, idx) => {
      const mEntries = invEntries.filter((e) => {
        const dt = new Date(e.entryDate);
        const matchCat = expMonthlyCatId === 'ALL' || e.categoryId === expMonthlyCatId;
        return matchCat && dt.getFullYear() === expMonthlyYear && dt.getMonth() === idx;
      });

      const cost = mEntries.reduce((s, e) => s + Number(e.adjustedAmount || 0), 0);
      return {
        month: `Thg ${idx + 1}`,
        monthNumber: idx + 1,
        cost,
        entryCount: mEntries.length,
      };
    });

    // 4. Top 10 Expense Items Table (by expTopFrom, expTopTo, expTopCatId)
    const topPeriodEntries = invEntries.filter((e) => {
      const dt = new Date(e.entryDate);
      const matchCat = expTopCatId === 'ALL' || e.categoryId === expTopCatId;
      return matchCat && dt >= expTopFrom && dt <= expTopTo;
    });

    const expItemMap = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        categoryName: string;
        unit: string;
        totalQuantity: number;
        entryCount: number;
        totalCalculated: number;
        totalAdjusted: number;
      }
    >();

    for (const en of topPeriodEntries) {
      const key = en.itemId || en.itemName;
      const existing = expItemMap.get(key) || {
        itemId: key,
        itemName: en.itemName,
        categoryName: en.categoryName,
        unit: en.unit,
        totalQuantity: 0,
        entryCount: 0,
        totalCalculated: 0,
        totalAdjusted: 0,
      };
      existing.totalQuantity += Number(en.quantity || 0);
      existing.entryCount += 1;
      existing.totalCalculated += Number(en.calculatedAmount || 0);
      existing.totalAdjusted += Number(en.adjustedAmount || 0);
      expItemMap.set(key, existing);
    }

    const totalTopPeriodExpense = topPeriodEntries.reduce(
      (s, e) => s + Number(e.adjustedAmount || 0),
      0
    );

    const topExpenseItems = Array.from(expItemMap.values())
      .sort((a, b) => b.totalAdjusted - a.totalAdjusted || b.entryCount - a.entryCount)
      .slice(0, 10);

    inventoryAnalytics = {
      categories: invCategories,
      dailyExpenseChart,
      monthlyExpenseChart,
      topExpenseItems,
      totalTopPeriodExpense,
    };
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
    netProfitCard,
    dailyChartData,
    monthlyChartData,
    topProductsByQuantity,
    topProductsByRevenue,
    inventoryAnalytics,
    staffList,
    staffStats,
    recentOrders: allOrders
      .filter((o) => !revStaffId || o.createdById === revStaffId)
      .slice(0, 6),
  });
}
