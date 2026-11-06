import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  getActiveUserSession,
  ensureInitialSeed,
  setOrderExpectedDelivery,
  attachExpectedDeliveryToOrders,
  getTodayUnfinishedOrderIds,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const staffId = searchParams.get('staffId');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const search = searchParams.get('search')?.trim();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
  const skip = (page - 1) * limit;

  const isAdmin = session.role === 'ADMIN';
  const todayUnfinishedIds = await getTodayUnfinishedOrderIds(
    session.userId,
    isAdmin,
    staffId && staffId !== 'ALL' ? staffId : null
  );

  const andConditions: any[] = [];

  // Quy tắc hiển thị đơn:
  // - TODAY_UNFINISHED (Chưa giao hôm nay): Tất cả đơn chưa hoàn thành cần giao trong ngày hôm nay, xếp theo giờ cần giao gần nhất lên đầu
  // - Đơn PENDING (Khách vãng lai đặt chờ xác nhận): Bất kỳ nhân viên nào hoặc Admin đều nhìn thấy để gọi khách & bấm Nhận Đơn
  // - Các trạng thái khác: Nhân viên nhìn thấy đơn của mình; Admin nhìn thấy tất cả (hoặc lọc theo staffId)
  if (status === 'TODAY_UNFINISHED') {
    andConditions.push({
      id: { in: todayUnfinishedIds.length > 0 ? todayUnfinishedIds : ['__NONE__'] },
    });
  } else if (!isAdmin) {
    if (status === 'PENDING') {
      andConditions.push({ status: 'PENDING' });
    } else if (!status || status === 'ALL') {
      andConditions.push({
        OR: [{ createdById: session.userId }, { status: 'PENDING' }],
      });
    } else {
      andConditions.push({ createdById: session.userId });
      andConditions.push({ status });
    }
  } else {
    if (staffId && staffId !== 'ALL') {
      andConditions.push({ createdById: staffId });
    }
    if (status && status !== 'ALL') {
      andConditions.push({ status });
    }
  }

  if (fromDate || toDate) {
    const createdAtFilter: any = {};
    if (fromDate) {
      createdAtFilter.gte = new Date(`${fromDate}T00:00:00.000+07:00`);
    }
    if (toDate) {
      createdAtFilter.lte = new Date(`${toDate}T23:59:59.999+07:00`);
    }
    andConditions.push({ createdAt: createdAtFilter });
  }

  // Tìm kiếm theo Tên người đặt (customerName), SĐT hoặc Địa chỉ giao đơn (shippingAddress)
  if (search) {
    andConditions.push({
      OR: [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { shippingAddress: { contains: search } },
      ],
    });
  }

  const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

  if (status === 'TODAY_UNFINISHED') {
    const [allMatchingRaw, pendingCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
          items: true,
        },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
    ]);

    const allWithExpected = await attachExpectedDeliveryToOrders(allMatchingRaw);
    allWithExpected.sort((a, b) => {
      const tA = new Date(a.expectedDeliveryAt || a.createdAt).getTime();
      const tB = new Date(b.expectedDeliveryAt || b.createdAt).getTime();
      return tA - tB;
    });

    const totalItems = allWithExpected.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const orders = allWithExpected.slice(skip, skip + limit);

    return NextResponse.json({
      orders,
      pendingCount,
      todayUnfinishedCount: todayUnfinishedIds.length,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  }

  const [totalItems, rawOrders, pendingCount] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            role: true,
          },
        },
        items: true,
      },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);

  const orders = await attachExpectedDeliveryToOrders(rawOrders);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return NextResponse.json({
    orders,
    pendingCount,
    todayUnfinishedCount: todayUnfinishedIds.length,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      shippingAddress,
      note,
      customCreatedAt,
      expectedDeliveryAt,
      orderDiscount,
      isFreeShip,
      shippingFee,
      items,
    } = body;

    if (!customerName?.trim() || !customerPhone?.trim() || !shippingAddress?.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Tên người nhận, SĐT và Địa chỉ giao hàng' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Đơn hàng phải có ít nhất 1 sản phẩm' },
        { status: 400 }
      );
    }

    const formattedItems = items.map((item: any) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const itemDiscount = Math.max(0, Number(item.itemDiscount) || 0);
      const lineTotal = Math.max(0, unitPrice * quantity - itemDiscount);

      return {
        productId: item.productId || null,
        productName: item.productName || 'Sản phẩm',
        productImage: item.productImage || null,
        quantity,
        preparedQty: 0,
        selectedSize: item.selectedSize || 'M (500ml)',
        sizeExtraPrice: Number(item.sizeExtraPrice) || 0,
        selectedSugar: item.selectedSugar || '100%',
        selectedIce: item.selectedIce || '100% đá',
        unitPrice,
        itemDiscount,
        lineTotal,
        note: item.note?.trim() || null,
      };
    });

    const subtotalAmount = formattedItems.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const cleanOrderDiscount = Math.max(0, Number(orderDiscount) || 0);
    const netRevenue = Math.max(0, subtotalAmount - cleanOrderDiscount);
    const freeShip = Boolean(isFreeShip);
    const cleanShippingFee = freeShip ? 0 : Math.max(0, Number(shippingFee) || 0);
    const finalAmount = netRevenue + cleanShippingFee;

    const count = await prisma.order.count();
    let orderCreatedAt = new Date();
    if (session.role === 'ADMIN' && customCreatedAt) {
      const parsedCreated = new Date(customCreatedAt);
      if (!isNaN(parsedCreated.getTime())) {
        orderCreatedAt = parsedCreated;
      }
    }

    const datePart = `${String(orderCreatedAt.getDate()).padStart(2, '0')}${String(
      orderCreatedAt.getMonth() + 1
    ).padStart(2, '0')}`;
    let orderCode = `NC-${datePart}-${String(count + 1).padStart(3, '0')}`;
    const existingCode = await prisma.order.findUnique({ where: { orderCode } });
    if (existingCode) {
      orderCode = `NC-${datePart}-${String(count + 1).padStart(3, '0')}-${Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase()}`;
    }

    const createdOrder = await prisma.order.create({
      data: {
        orderCode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        note: note?.trim() || null,
        subtotalAmount,
        orderDiscount: cleanOrderDiscount,
        netRevenue,
        isFreeShip: freeShip,
        shippingFee: cleanShippingFee,
        finalAmount,
        status: 'CREATED',
        createdById: session.userId,
        createdAt: orderCreatedAt,
        items: {
          create: formattedItems,
        },
      },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
        items: true,
      },
    });

    const defaultExpected = new Date(Date.now() + 20 * 60 * 1000);
    const savedExpected = await setOrderExpectedDelivery(
      createdOrder.id,
      expectedDeliveryAt || defaultExpected
    );

    return NextResponse.json({
      success: true,
      order: {
        ...createdOrder,
        expectedDeliveryAt: savedExpected,
      },
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tạo đơn hàng' },
      { status: 500 }
    );
  }
}
