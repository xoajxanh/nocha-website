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
    const categoryId = String(body.categoryId || '').trim();
    const unit = String(body.unit || 'cái').trim() || 'cái';
    const referencePrice = Math.max(0, Number(body.referencePrice) || 0);
    const note = body.note ? String(body.note).trim() : null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Tên sản phẩm kho và chọn Danh mục' },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      UPDATE [dbo].[InventoryItem]
      SET
        [categoryId] = ${categoryId},
        [name] = ${name},
        [unit] = ${unit},
        [referencePrice] = ${referencePrice},
        [note] = ${note},
        [isActive] = ${isActive ? 1 : 0},
        [updatedAt] = SYSUTCDATETIME()
      WHERE [id] = ${params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update inventory item error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật sản phẩm kho' }, { status: 500 });
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
      UPDATE [dbo].[InventoryItem]
      SET [isDeleted] = 1, [isActive] = 0, [updatedAt] = SYSUTCDATETIME()
      WHERE [id] = ${params.id}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete inventory item error:', err);
    return NextResponse.json({ error: 'Không thể xóa sản phẩm kho' }, { status: 500 });
  }
}

