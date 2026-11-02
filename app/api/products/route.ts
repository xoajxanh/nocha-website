import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
  getActiveUserSession,
  ensureInitialSeed,
  DEFAULT_SIZES_JSON,
  DEFAULT_SUGAR_JSON,
  DEFAULT_ICE_JSON,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  await ensureInitialSeed();
  const session = await getActiveUserSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const activeOnly = searchParams.get('activeOnly') === 'true';

  const whereClause: any = { isDeleted: false };
  if (categoryId && categoryId !== 'ALL') {
    whereClause.categoryId = categoryId;
  }
  if (activeOnly) {
    whereClause.isActive = true;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      category: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền thêm sản phẩm' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      categoryId,
      description,
      basePrice,
      imageUrl,
      sizes,
      sugarOptions,
      iceOptions,
      sortOrder,
      isActive,
    } = body;

    if (!name || !name.trim() || !categoryId) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên sản phẩm và chọn danh mục' },
        { status: 400 }
      );
    }

    const sizesJson = Array.isArray(sizes)
      ? JSON.stringify(sizes)
      : typeof sizes === 'string' && sizes.trim()
      ? sizes
      : DEFAULT_SIZES_JSON;

    const sugarOptionsJson = Array.isArray(sugarOptions)
      ? JSON.stringify(sugarOptions)
      : typeof sugarOptions === 'string' && sugarOptions.trim()
      ? sugarOptions
      : DEFAULT_SUGAR_JSON;

    const iceOptionsJson = Array.isArray(iceOptions)
      ? JSON.stringify(iceOptions)
      : typeof iceOptions === 'string' && iceOptions.trim()
      ? iceOptions
      : DEFAULT_ICE_JSON;

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        categoryId,
        description: description?.trim() || null,
        basePrice: Number(basePrice) || 0,
        imageUrl: imageUrl?.trim() || '/images/products/matcha-latte.jpg',
        sizesJson,
        sugarOptionsJson,
        iceOptionsJson,
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi thêm sản phẩm' },
      { status: 500 }
    );
  }
}

