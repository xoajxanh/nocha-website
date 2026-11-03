import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInventoryTables } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await ensureInventoryTables();
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền Quản lý Kho' }, { status: 403 });
  }

  try {
    const items = await prisma.$queryRaw<
      Array<{
        id: string;
        categoryId: string;
        categoryName: string;
        name: string;
        unit: string;
        referencePrice: number;
        note: string | null;
        isActive: boolean;
        createdAt: Date;
        entryCount: number;
      }>
    >`
      SELECT
        i.[id],
        i.[categoryId],
        ISNULL(c.[name], N'Khác') AS [categoryName],
        i.[name],
        i.[unit],
        i.[referencePrice],
        i.[note],
        i.[isActive],
        i.[createdAt],
        (
          SELECT COUNT(*)
          FROM [dbo].[InventoryEntry] e
          WHERE e.[itemId] = i.[id]
        ) AS [entryCount]
      FROM [dbo].[InventoryItem] i
      LEFT JOIN [dbo].[InventoryCategory] c ON c.[id] = i.[categoryId]
      WHERE i.[isDeleted] = 0
      ORDER BY ISNULL(c.[sortOrder], 99) ASC, i.[name] ASC
    `;

    return NextResponse.json({
      items: items.map((it) => ({
        ...it,
        referencePrice: Number(it.referencePrice || 0),
        isActive: Boolean(it.isActive),
        entryCount: Number(it.entryCount || 0),
      })),
    });
  } catch (err: any) {
    console.error('Get inventory items error:', err);
    return NextResponse.json({ error: 'Không thể tải danh sách sản phẩm kho' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO [dbo].[InventoryItem] ([id], [categoryId], [name], [unit], [referencePrice], [note], [isActive], [isDeleted])
      VALUES (${id}, ${categoryId}, ${name}, ${unit}, ${referencePrice}, ${note}, ${isActive ? 1 : 0}, 0)
    `;

    return NextResponse.json({
      success: true,
      item: { id, categoryId, name, unit, referencePrice, note, isActive },
    });
  } catch (err: any) {
    console.error('Create inventory item error:', err);
    return NextResponse.json({ error: 'Không thể tạo sản phẩm kho' }, { status: 500 });
  }
}

