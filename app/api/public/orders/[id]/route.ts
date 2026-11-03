import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  ensureInitialSeed,
  attachExpectedDeliveryToOrders,
  getActiveUserSession,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureInitialSeed();
    const idOrCode = (params.id || '').trim();
    if (!idOrCode) {
      return NextResponse.json({ error: 'Mã đơn không hợp lệ' }, { status: 400 });
    }

    let rawOrder = await prisma.order.findUnique({
      where: { id: idOrCode },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, role: true },
        },
        items: true,
      },
    });

    if (!rawOrder) {
      rawOrder = await prisma.order.findUnique({
        where: { orderCode: idOrCode },
        include: {
          createdBy: {
            select: { id: true, username: true, displayName: true, role: true },
          },
          items: true,
        },
      });
    }

    const session = await getActiveUserSession(req);

    if (!rawOrder) {
      return NextResponse.json(
        {
          error: 'Không tìm thấy đơn hàng hoặc đơn đã bị xóa',
          isAdmin: session?.role === 'ADMIN',
          currentUser: session || null,
        },
        { status: 404 }
      );
    }

    const [order] = await attachExpectedDeliveryToOrders([rawOrder]);

    return NextResponse.json({
      order,
      isAdmin: session?.role === 'ADMIN',
      currentUser: session || null,
    });
  } catch (err: any) {
    console.error('Get public order detail error:', err);
    return NextResponse.json(
      { error: 'Không thể tải thông tin đơn hàng' },
      { status: 500 }
    );
  }
}

