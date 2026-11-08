import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureInitialSeed, setOrderExpectedDelivery } from '@/lib/db';
import { sendPushToStaff } from '@/lib/push';

export const dynamic = 'force-dynamic';

let orderColumnAltered = false;

// In-memory IP rate limiter for public guest orders (chống spam / flood đơn ảo)
const guestOrderRateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 phút
const MAX_ORDERS_PER_WINDOW = 6; // Tối đa 6 đơn / 5 phút trên mỗi IP

function checkGuestRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (guestOrderRateMap.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_ORDERS_PER_WINDOW) {
    guestOrderRateMap.set(ip, timestamps);
    return false;
  }
  timestamps.push(now);
  guestOrderRateMap.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!checkGuestRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            'Bạn đã gửi quá nhiều đơn trong thời gian ngắn. Vui lòng đợi ít phút hoặc gọi trực tiếp Hotline 0989600992 nhé!',
        },
        { status: 429 }
      );
    }

    await ensureInitialSeed();
    if (!orderColumnAltered) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE [dbo].[Order] ALTER COLUMN [createdById] NVARCHAR(1000) NULL;`
        );
        orderColumnAltered = true;
      } catch {}
    }
    const body = await req.json();
    const { customerName, customerPhone, shippingAddress, note, expectedDeliveryAt, items } = body;

    const cleanName = String(customerName || '').trim().slice(0, 100);
    const cleanPhone = String(customerPhone || '').trim().slice(0, 20);
    const cleanAddress = String(shippingAddress || '').trim().slice(0, 300);
    const cleanNote = note ? String(note).trim().slice(0, 300) : null;

    if (!cleanName || !cleanPhone || !cleanAddress) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng' },
        { status: 400 }
      );
    }

    if (!/^[0-9+\-\s().]{8,15}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Số điện thoại không hợp lệ, vui lòng kiểm tra lại' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return NextResponse.json(
        { error: 'Giỏ hàng không hợp lệ (tối đa 30 dòng món mỗi đơn)' },
        { status: 400 }
      );
    }

    // Fetch products from DB to ensure 100% server-side pricing (chống can thiệp sửa giá từ client)
    const productIds = items.map((it: any) => String(it.productId || '')).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false, isActive: true },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const formattedItems: any[] = [];
    for (const item of items) {
      const dbProd = productMap.get(String(item.productId || ''));
      if (!dbProd) {
        return NextResponse.json(
          { error: 'Có món đồ uống trong giỏ không tồn tại hoặc đã tạm ngưng phục vụ' },
          { status: 400 }
        );
      }

      const quantity = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
      const basePrice = Math.max(0, Number(dbProd.basePrice) || 0);
      let sizeExtraPrice = 0;
      let selectedSize = 'M (500ml)';

      if (dbProd.sizesJson) {
        try {
          const parsedSizes = JSON.parse(dbProd.sizesJson);
          if (Array.isArray(parsedSizes) && parsedSizes.length > 0) {
            const foundSize =
              parsedSizes.find((s: any) => s.name === item.selectedSize) || parsedSizes[0];
            if (foundSize) {
              selectedSize = String(foundSize.name).slice(0, 50);
              sizeExtraPrice = Number(foundSize.price) || 0;
            }
          }
        } catch {}
      }

      const unitPrice = Math.max(0, basePrice + sizeExtraPrice);
      const lineTotal = unitPrice * quantity;

      formattedItems.push({
        productId: dbProd.id,
        productName: dbProd.name,
        productImage: dbProd.imageUrl || null,
        quantity,
        preparedQty: 0,
        selectedSize,
        sizeExtraPrice,
        selectedSugar: String(item.selectedSugar || '100%').slice(0, 30),
        selectedIce: String(item.selectedIce || '100% đá').slice(0, 30),
        unitPrice,
        itemDiscount: 0,
        lineTotal,
        note: item.note ? String(item.note).trim().slice(0, 200) : null,
      });
    }

    const subtotalAmount = formattedItems.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const netRevenue = subtotalAmount;
    const finalAmount = subtotalAmount;

    const count = await prisma.order.count();
    const now = new Date();
    const datePart = `${String(now.getDate()).padStart(2, '0')}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    let orderCode = `NC-${datePart}-${String(count + 1).padStart(3, '0')}`;
    const existingCode = await prisma.order.findUnique({ where: { orderCode } });
    if (existingCode) {
      orderCode = `NC-${datePart}-${String(count + 1).padStart(3, '0')}-${Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase()}`;
    }

    // Tìm hoặc tạo tài khoản hệ thống ẩn dành cho đơn khách vãng lai (để tương thích FK & Prisma)
    // Khi nhân viên bấm "NHẬN ĐƠN", createdById sẽ được chuyển sang ID của nhân viên đó.
    let guestUser = await prisma.user.findUnique({
      where: { username: '__guest_online__' },
    });
    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: {
          username: '__guest_online__',
          passwordHash: 'DISABLED_GUEST_SYSTEM_ACCOUNT',
          displayName: 'Khách Đặt Online',
          role: 'GUEST',
          isLocked: true,
          isDeleted: true,
        },
      });
    }

    const createdOrder = await prisma.order.create({
      data: {
        orderCode,
        customerName: cleanName,
        customerPhone: cleanPhone,
        shippingAddress: cleanAddress,
        note: cleanNote,
        subtotalAmount,
        orderDiscount: 0,
        netRevenue,
        isFreeShip: true,
        shippingFee: 0,
        finalAmount,
        status: 'PENDING', // Chờ nhân viên gọi điện xác nhận & bấm Nhận Đơn
        createdById: guestUser.id,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    const defaultExpected = new Date(Date.now() + 20 * 60 * 1000);
    const savedExpected = await setOrderExpectedDelivery(
      createdOrder.id,
      expectedDeliveryAt || defaultExpected
    );

    // Gửi thông báo đẩy tới nhân viên (không chặn phản hồi cho khách)
    const totalCups = formattedItems.reduce(
      (s: number, it: any) => s + (Number(it.quantity) || 0),
      0
    );
    sendPushToStaff({
      title: '🔔 Đơn mới chờ xác nhận!',
      body: `${cleanName} • ${totalCups} cốc • ${Number(finalAmount || 0).toLocaleString('vi-VN')}đ\n${cleanAddress}`,
      url: `/order/${createdOrder.id}`,
      tag: `order-${createdOrder.id}`,
    }).catch((err) => console.error('Push new order failed:', err));

    return NextResponse.json({
      success: true,
      order: {
        ...createdOrder,
        expectedDeliveryAt: savedExpected,
      },
    });
  } catch (error: any) {
    console.error('Public guest order error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi gửi đơn đặt hàng, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}
