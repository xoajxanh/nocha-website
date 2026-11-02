import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession, ensureInitialSeed } from '@/lib/db';

function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 6)
  );
}

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: {
          products: { where: { isDeleted: false } },
        },
      },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền thêm danh mục' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, sortOrder, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên danh mục' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slugify(name.trim()),
        description: description?.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tạo danh mục' },
      { status: 500 }
    );
  }
}

