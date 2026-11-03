import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInventoryTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureInventoryTables();
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền Quản lý Kho' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const description = body.description ? String(body.description).trim() : null;
    const sortOrder = Number(body.sortOrder) || 0;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name) {
      return NextResponse.json({ error: 'Tên danh mục không được để trống' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE [dbo].[InventoryCategory]
      SET
        [name] = ${name},
        [description] = ${description},
        [sortOrder] = ${sortOrder},
        [isActive] = ${isActive ? 1 : 0},
        [updatedAt] = SYSUTCDATETIME()
      WHERE [id] = ${params.id}
    `;

    // Đồng bộ tên danh mục sang các phiếu nhập kho của danh mục này để thống kê luôn nhất quán
    await prisma.$executeRaw`
      UPDATE [dbo].[InventoryEntry]
      SET [categoryName] = ${name}
      WHERE [categoryId] = ${params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update inventory category error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật danh mục kho' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureInventoryTables();
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền Quản lý Kho' }, { status: 403 });
  }

  try {
    await prisma.$executeRaw`
      UPDATE [dbo].[InventoryCategory]
      SET [isDeleted] = 1, [isActive] = 0, [updatedAt] = SYSUTCDATETIME()
      WHERE [id] = ${params.id}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete inventory category error:', err);
    return NextResponse.json({ error: 'Không thể xóa danh mục kho' }, { status: 500 });
  }
}

