import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Endpoint siêu nhẹ cho chuông báo đơn mới (poll định kỳ từ Navbar)
export async function GET(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const [pendingCount, latest] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, customerName: true, finalAmount: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ pendingCount, latest });
}
