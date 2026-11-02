import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  getActiveUserSession,
  setOrderExpectedDelivery,
  attachExpectedDeliveryToOrders,
} from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: { id: true, username: true, displayName: true, role: true },
      },
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
  }

  if (
    session.role !== 'ADMIN' &&
    order.status !== 'PENDING' &&
    order.createdById !== session.userId
  ) {
    return NextResponse.json({ error: 'Bạn không có quyền xem đơn hàng này' }, { status: 403 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // Cho phép bất kỳ nhân viên nào thao tác nhận đơn PENDING; còn các trạng thái khác phải là chủ đơn hoặc Admin
    if (
      session.role !== 'ADMIN' &&
      order.status !== 'PENDING' &&
      order.createdById !== session.userId
    ) {
      return NextResponse.json({ error: 'Bạn không có quyền thao tác đơn hàng này' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Update prepared quantity of an order item
    if (action === 'UPDATE_PREP') {
      const { itemId, preparedQty, markAll } = body;

      if (markAll) {
        await Promise.all(
          order.items.map((it) =>
            prisma.orderItem.update({
              where: { id: it.id },
              data: { preparedQty: it.quantity },
            })
          )
        );
      } else {
        const targetItem = order.items.find((it) => it.id === itemId);
        if (!targetItem) {
          return NextResponse.json({ error: 'Không tìm thấy dòng sản phẩm' }, { status: 404 });
        }
        const clampedQty = Math.max(0, Math.min(targetItem.quantity, Number(preparedQty)));
        await prisma.orderItem.update({
          where: { id: itemId },
          data: { preparedQty: clampedQty },
        });
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
          createdBy: { select: { id: true, username: true, displayName: true, role: true } },
          items: true,
        },
      });
      const [withExpected] = await attachExpectedDeliveryToOrders(
        updatedOrder ? [updatedOrder] : []
      );

      return NextResponse.json({ success: true, order: withExpected || updatedOrder });
    }

    // 1b. Update Expected Delivery Time (Nhân viên set lại giờ nhận đồ dự kiến sau khi xác nhận với khách)
    if (action === 'UPDATE_EXPECTED_TIME') {
      const { expectedDeliveryAt } = body;
      await setOrderExpectedDelivery(params.id, expectedDeliveryAt);
      const updatedOrder = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
          createdBy: { select: { id: true, username: true, displayName: true, role: true } },
          items: true,
        },
      });
      const [withExpected] = await attachExpectedDeliveryToOrders(
        updatedOrder ? [updatedOrder] : []
      );
      return NextResponse.json({ success: true, order: withExpected || updatedOrder });
    }

    // 2. Transition Order Status:
    // PENDING (Chờ xác nhận) -> CREATED (Nhận Đơn) hoặc CANCELLED (Hủy đơn)
    // CREATED (Đã tạo đơn) -> SHIPPING (Đi Đơn)
    // SHIPPING (Đang vận chuyển) -> COMPLETED (Đã Nhận Tiền) hoặc CANCELLED (Hoàn Đơn)
    if (action === 'UPDATE_STATUS') {
      const { newStatus, expectedDeliveryAt } = body;

      if (expectedDeliveryAt !== undefined) {
        await setOrderExpectedDelivery(params.id, expectedDeliveryAt);
      }

      // Bước 0: Đơn khách vãng lai đặt (PENDING - Chờ xác nhận)
      if (order.status === 'PENDING') {
        if (newStatus !== 'CREATED' && newStatus !== 'CANCELLED') {
          return NextResponse.json(
            { error: 'Đơn chờ xác nhận chỉ có thể chuyển sang NHẬN ĐƠN (Đã tạo đơn) hoặc HỦY ĐƠN' },
            { status: 400 }
          );
        }

        const updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: {
            status: newStatus,
            createdById: session.userId, // Gán nhân viên bấm Nhận Đơn làm người phụ trách đơn này
            ...(newStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
          },
          include: {
            createdBy: { select: { id: true, username: true, displayName: true, role: true } },
            items: true,
          },
        });
        const [withExpected] = await attachExpectedDeliveryToOrders([updatedOrder]);
        return NextResponse.json({ success: true, order: withExpected });
      }

      // Bước 1: Đơn đã tạo (CREATED) -> ĐI ĐƠN (SHIPPING)
      if (order.status === 'CREATED') {
        if (newStatus !== 'SHIPPING') {
          return NextResponse.json(
            { error: 'Đơn đã tạo chỉ có thể chuyển sang trạng thái ĐI ĐƠN (Đang vận chuyển)' },
            { status: 400 }
          );
        }
        const updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: {
            status: 'SHIPPING',
            shippedAt: new Date(),
          },
          include: {
            createdBy: { select: { id: true, username: true, displayName: true, role: true } },
            items: true,
          },
        });
        const [withExpected] = await attachExpectedDeliveryToOrders([updatedOrder]);
        return NextResponse.json({ success: true, order: withExpected });
      }

      // Bước 2: Đơn đang vận chuyển (SHIPPING) -> ĐÃ NHẬN TIỀN (COMPLETED) hoặc HOÀN ĐƠN (CANCELLED)
      if (order.status === 'SHIPPING') {
        if (newStatus !== 'COMPLETED' && newStatus !== 'CANCELLED') {
          return NextResponse.json(
            { error: 'Đơn đang vận chuyển chỉ có thể chuyển sang ĐÃ NHẬN TIỀN (Hoàn thành) hoặc HOÀN ĐƠN (Đã hủy)' },
            { status: 400 }
          );
        }
        const updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: {
            status: newStatus,
            ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
            ...(newStatus === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
          },
          include: {
            createdBy: { select: { id: true, username: true, displayName: true, role: true } },
            items: true,
          },
        });
        const [withExpected] = await attachExpectedDeliveryToOrders([updatedOrder]);
        return NextResponse.json({ success: true, order: withExpected });
      }

      return NextResponse.json(
        { error: 'Đơn hàng đã kết thúc, không thể chuyển trạng thái tiếp' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi cập nhật đơn hàng' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa đơn hàng' }, { status: 403 });
  }

  try {
    await prisma.order.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể xóa đơn hàng' },
      { status: 500 }
    );
  }
}
