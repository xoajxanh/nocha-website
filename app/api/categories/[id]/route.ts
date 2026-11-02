import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền sửa danh mục' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, sortOrder, isActive } = body;

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) || 0 } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể cập nhật danh mục' },
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
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa danh mục' }, { status: 403 });
  }

  try {
    await prisma.category.update({
      where: { id: params.id },
      data: { isDeleted: true, isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể xóa danh mục' },
      { status: 500 }
    );
  }
}

