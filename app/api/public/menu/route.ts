import { NextResponse } from 'next/server';
import { prisma, ensureInitialSeed } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureInitialSeed();

    const categories = await prisma.category.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        products: {
          where: {
            isDeleted: false,
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Public menu error:', error);
    return NextResponse.json({ categories: [], error: error.message }, { status: 500 });
  }
}

