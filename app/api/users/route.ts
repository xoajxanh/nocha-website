import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInitialSeed } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền quản lý nhân viên' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      role: true,
      isLocked: true,
      createdAt: true,
      orders: {
        select: {
          id: true,
          status: true,
          netRevenue: true,
        },
      },
    },
  });

  const formattedUsers = users.map((u) => {
    const totalOrders = u.orders.length;
    const completedOrders = u.orders.filter((o) => o.status === 'COMPLETED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.netRevenue || 0), 0);
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      phone: u.phone || '',
      role: u.role,
      isLocked: u.isLocked,
      createdAt: u.createdAt,
      totalOrders,
      completedOrdersCount: completedOrders.length,
      totalRevenue,
    };
  });

  return NextResponse.json({ users: formattedUsers });
}

export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo nhân viên' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, displayName, phone, role } = body;

    if (!username || !password || !displayName) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Tên hiển thị' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing && !existing.isDeleted) {
      return NextResponse.json(
        { error: `Tên đăng nhập "${cleanUsername}" đã tồn tại` },
        { status: 400 }
      );
    }

    if (existing && existing.isDeleted) {
      const restored = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: hashPassword(password),
          displayName: displayName.trim(),
          phone: phone?.trim() || null,
          role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
          isLocked: false,
          isDeleted: false,
        },
      });
      return NextResponse.json({ success: true, user: restored });
    }

    const created = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash: hashPassword(password),
        displayName: displayName.trim(),
        phone: phone?.trim() || null,
        role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: created.id,
        username: created.username,
        displayName: created.displayName,
        phone: created.phone,
        role: created.role,
        isLocked: created.isLocked,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tạo tài khoản nhân viên' },
      { status: 500 }
    );
  }
}

