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
    const itemId = String(body.itemId || '').trim();
    if (!itemId) {
      return NextResponse.json({ error: 'Vui lòng chọn sản phẩm kho' }, { status: 400 });
    }

    const itemRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        categoryId: string;
        categoryName: string;
        unit: string;
      }>
    >`
      SELECT
        i.[id],
        i.[name],
        i.[categoryId],
        ISNULL(c.[name], N'Khác') AS [categoryName],
        i.[unit]
      FROM [dbo].[InventoryItem] i
      LEFT JOIN [dbo].[InventoryCategory] c ON c.[id] = i.[categoryId]
      WHERE i.[id] = ${itemId}
    `;

    const dbItem = itemRows?.[0];
    if (!dbItem) {
      return NextResponse.json({ error: 'Sản phẩm kho không tồn tại' }, { status: 404 });
    }

    const unit = String(body.unit || dbItem.unit || 'cái').trim() || dbItem.unit;
    const unitPrice = Math.max(0, Number(body.unitPrice) || 0);
    const quantity = Math.max(0.01, Number(body.quantity) || 1);
    const calculatedAmount = Math.round(unitPrice * quantity);
    const adjustedAmount =
      body.adjustedAmount !== undefined && body.adjustedAmount !== ''
        ? Math.max(0, Number(body.adjustedAmount) || 0)
        : calculatedAmount;

    let entryDate = new Date();
    if (body.entryDate) {
      const parsed = new Date(body.entryDate);
      if (!isNaN(parsed.getTime())) {
        entryDate = parsed;
      }
    }

    const note = body.note ? String(body.note).trim() : null;

    await prisma.$executeRaw`
      UPDATE [dbo].[InventoryEntry]
      SET
        [itemId] = ${dbItem.id},
        [itemName] = ${dbItem.name},
        [categoryId] = ${dbItem.categoryId},
        [categoryName] = ${dbItem.categoryName},
        [unit] = ${unit},
        [unitPrice] = ${unitPrice},
        [quantity] = ${quantity},
        [calculatedAmount] = ${calculatedAmount},
        [adjustedAmount] = ${adjustedAmount},
        [entryDate] = ${entryDate},
        [note] = ${note},
        [updatedAt] = SYSUTCDATETIME()
      WHERE [id] = ${params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update inventory entry error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật phiếu nhập kho' }, { status: 500 });
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
      DELETE FROM [dbo].[InventoryEntry]
      WHERE [id] = ${params.id}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete inventory entry error:', err);
    return NextResponse.json({ error: 'Không thể xóa phiếu nhập kho' }, { status: 500 });
  }
}

