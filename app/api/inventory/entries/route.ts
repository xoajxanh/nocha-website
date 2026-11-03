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
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || 'ALL';
    const itemId = searchParams.get('itemId') || 'ALL';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        entryCode: string;
        itemId: string;
        itemName: string;
        categoryId: string;
        categoryName: string;
        unit: string;
        unitPrice: number;
        quantity: number;
        calculatedAmount: number;
        adjustedAmount: number;
        entryDate: Date;
        note: string | null;
        createdById: string | null;
        createdByName: string | null;
        createdAt: Date;
      }>
    >`
      SELECT
        [id],
        [entryCode],
        [itemId],
        [itemName],
        [categoryId],
        [categoryName],
        [unit],
        [unitPrice],
        [quantity],
        [calculatedAmount],
        [adjustedAmount],
        [entryDate],
        [note],
        [createdById],
        [createdByName],
        [createdAt]
      FROM [dbo].[InventoryEntry]
      ORDER BY [entryDate] DESC, [createdAt] DESC
    `;

    let filtered = rows.map((r) => ({
      ...r,
      unitPrice: Number(r.unitPrice || 0),
      quantity: Number(r.quantity || 0),
      calculatedAmount: Number(r.calculatedAmount || 0),
      adjustedAmount: Number(r.adjustedAmount || 0),
    }));

    if (categoryId && categoryId !== 'ALL') {
      filtered = filtered.filter((r) => r.categoryId === categoryId);
    }
    if (itemId && itemId !== 'ALL') {
      filtered = filtered.filter((r) => r.itemId === itemId);
    }
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00.000+07:00`);
      if (!isNaN(start.getTime())) {
        filtered = filtered.filter((r) => new Date(r.entryDate) >= start);
      }
    }
    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999+07:00`);
      if (!isNaN(end.getTime())) {
        filtered = filtered.filter((r) => new Date(r.entryDate) <= end);
      }
    }
    if (search) {
      filtered = filtered.filter(
        (r) =>
          (r.itemName || '').toLowerCase().includes(search) ||
          (r.entryCode || '').toLowerCase().includes(search) ||
          (r.categoryName || '').toLowerCase().includes(search) ||
          (r.note || '').toLowerCase().includes(search)
      );
    }

    const totalCalculated = filtered.reduce((s, r) => s + r.calculatedAmount, 0);
    const totalAdjusted = filtered.reduce((s, r) => s + r.adjustedAmount, 0);

    return NextResponse.json({
      entries: filtered,
      summary: {
        count: filtered.length,
        totalCalculated,
        totalAdjusted,
      },
    });
  } catch (err: any) {
    console.error('Get inventory entries error:', err);
    return NextResponse.json({ error: 'Không thể tải danh sách nhập kho' }, { status: 500 });
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
    const itemId = String(body.itemId || '').trim();
    if (!itemId) {
      return NextResponse.json({ error: 'Vui lòng chọn sản phẩm kho cần nhập' }, { status: 400 });
    }

    const itemRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        categoryId: string;
        categoryName: string;
        unit: string;
        referencePrice: number;
      }>
    >`
      SELECT
        i.[id],
        i.[name],
        i.[categoryId],
        ISNULL(c.[name], N'Khác') AS [categoryName],
        i.[unit],
        i.[referencePrice]
      FROM [dbo].[InventoryItem] i
      LEFT JOIN [dbo].[InventoryCategory] c ON c.[id] = i.[categoryId]
      WHERE i.[id] = ${itemId}
    `;

    const dbItem = itemRows?.[0];
    if (!dbItem) {
      return NextResponse.json({ error: 'Sản phẩm kho không tồn tại' }, { status: 404 });
    }

    const unit = String(body.unit || dbItem.unit || 'cái').trim() || dbItem.unit;
    const unitPrice =
      body.unitPrice !== undefined && body.unitPrice !== ''
        ? Math.max(0, Number(body.unitPrice) || 0)
        : Number(dbItem.referencePrice || 0);
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

    const cntRes = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*) AS cnt FROM [dbo].[InventoryEntry]
    `;
    const count = Number(cntRes?.[0]?.cnt || 0);
    const datePart = `${String(entryDate.getDate()).padStart(2, '0')}${String(
      entryDate.getMonth() + 1
    ).padStart(2, '0')}`;
    const entryCode = `NK-${datePart}-${String(count + 1).padStart(3, '0')}`;
    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO [dbo].[InventoryEntry] (
        [id],
        [entryCode],
        [itemId],
        [itemName],
        [categoryId],
        [categoryName],
        [unit],
        [unitPrice],
        [quantity],
        [calculatedAmount],
        [adjustedAmount],
        [entryDate],
        [note],
        [createdById],
        [createdByName]
      )
      VALUES (
        ${id},
        ${entryCode},
        ${dbItem.id},
        ${dbItem.name},
        ${dbItem.categoryId},
        ${dbItem.categoryName},
        ${unit},
        ${unitPrice},
        ${quantity},
        ${calculatedAmount},
        ${adjustedAmount},
        ${entryDate},
        ${note},
        ${session.userId},
        ${session.displayName}
      )
    `;

    return NextResponse.json({
      success: true,
      entry: {
        id,
        entryCode,
        itemId: dbItem.id,
        itemName: dbItem.name,
        categoryId: dbItem.categoryId,
        categoryName: dbItem.categoryName,
        unit,
        unitPrice,
        quantity,
        calculatedAmount,
        adjustedAmount,
        entryDate,
        note,
      },
    });
  } catch (err: any) {
    console.error('Create inventory entry error:', err);
    return NextResponse.json({ error: 'Không thể lưu phiếu nhập kho' }, { status: 500 });
  }
}

