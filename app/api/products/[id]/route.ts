import { NextRequest, NextResponse } from 'next/server';
import { prisma, getActiveUserSession } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền sửa sản phẩm' }, { status: 403 });
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

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice) || 0;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (sizes !== undefined) {
      updateData.sizesJson = Array.isArray(sizes) ? JSON.stringify(sizes) : sizes;
    }
    if (sugarOptions !== undefined) {
      updateData.sugarOptionsJson = Array.isArray(sugarOptions)
        ? JSON.stringify(sugarOptions)
        : sugarOptions;
    }
    if (iceOptions !== undefined) {
      updateData.iceOptionsJson = Array.isArray(iceOptions)
        ? JSON.stringify(iceOptions)
        : iceOptions;
    }
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể cập nhật sản phẩm' },
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
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa sản phẩm' }, { status: 403 });
  }

  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { isDeleted: true, isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Không thể xóa sản phẩm' },
      { status: 500 }
    );
  }
}

