import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền cập nhật nhân viên' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { displayName, phone, role, isLocked, resetPassword } = body;

    if (params.id === session.userId && isLocked === true) {
      return NextResponse.json(
        { error: 'Bạn không thể tự khóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (displayName !== undefined && displayName.trim()) {
      updateData.displayName = displayName.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }
    if (role !== undefined && params.id !== session.userId) {
      updateData.role = role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    }
    if (isLocked !== undefined) {
      updateData.isLocked = Boolean(isLocked);
    }
    if (resetPassword && typeof resetPassword === 'string' && resetPassword.trim().length >= 4) {
      updateData.passwordHash = hashPassword(resetPassword.trim());
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        phone: true,
        role: true,
        isLocked: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi cập nhật tài khoản nhân viên' },
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
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa nhân viên' }, { status: 403 });
  }

  if (params.id === session.userId) {
    return NextResponse.json(
      { error: 'Không thể tự xóa tài khoản Admin đang đăng nhập' },
      { status: 400 }
    );
  }

  try {
    const orderCount = await prisma.order.count({
      where: { createdById: params.id },
    });

    if (orderCount > 0) {
      await prisma.user.update({
        where: { id: params.id },
        data: { isDeleted: true, isLocked: true },
      });
    } else {
      await prisma.user.delete({
        where: { id: params.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể xóa tài khoản' },
      { status: 500 }
    );
  }
}

