import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInitialSeed } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: {
      ...session,
      phone: dbUser?.phone || '',
      createdAt: dbUser?.createdAt,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { displayName, phone, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const updateData: any = {};
    if (displayName && displayName.trim()) {
      updateData.displayName = displayName.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    if (newPassword) {
      if (!currentPassword || !comparePassword(currentPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: 'Mật khẩu hiện tại không đúng' },
          { status: 400 }
        );
      }
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: 'Mật khẩu mới phải từ 4 ký tự trở lên' },
          { status: 400 }
        );
      }
      updateData.passwordHash = hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        userId: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi cập nhật thông tin cá nhân' },
      { status: 500 }
    );
  }
}

