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
    const categories = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        sortOrder: number;
        isActive: boolean;
        isDeleted: boolean;
        createdAt: Date;
        itemCount: number;
      }>
    >`
      SELECT
        c.[id],
        c.[name],
        c.[description],
        c.[sortOrder],
        c.[isActive],
        c.[isDeleted],
        c.[createdAt],
        (
          SELECT COUNT(*)
          FROM [dbo].[InventoryItem] i
          WHERE i.[categoryId] = c.[id] AND i.[isDeleted] = 0
        ) AS [itemCount]
      FROM [dbo].[InventoryCategory] c
      WHERE c.[isDeleted] = 0
      ORDER BY c.[sortOrder] ASC, c.[createdAt] ASC
    `;

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        isActive: Boolean(c.isActive),
        itemCount: Number(c.itemCount || 0),
      })),
    });
  } catch (err: any) {
    console.error('Get inventory categories error:', err);
    return NextResponse.json({ error: 'Lỗi tải danh mục kho' }, { status: 500 });
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
    const description = body.description ? String(body.description).trim() : null;
    const sortOrder = Number(body.sortOrder) || 0;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name) {
      return NextResponse.json({ error: 'Vui lòng nhập tên danh mục kho' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO [dbo].[InventoryCategory] ([id], [name], [description], [sortOrder], [isActive], [isDeleted])
      VALUES (${id}, ${name}, ${description}, ${sortOrder}, ${isActive ? 1 : 0}, 0)
    `;

    return NextResponse.json({
      success: true,
      category: { id, name, description, sortOrder, isActive },
    });
  } catch (err: any) {
    console.error('Create inventory category error:', err);
    return NextResponse.json({ error: 'Không thể tạo danh mục kho' }, { status: 500 });
  }
}

