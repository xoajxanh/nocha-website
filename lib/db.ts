import { PrismaClient } from '@prisma/client';
import { hashPassword, getSessionUser, UserSession } from './auth';
import { NextRequest } from 'next/server';

const PRISMA_SCHEMA_VERSION = 'v2_guest_pending';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  prismaSchemaVersion?: string;
  seedVersion?: string;
};

function createPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma && globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION) {
    return globalForPrisma.prisma;
  }
  try {
    if (globalForPrisma.prisma) {
      globalForPrisma.prisma.$disconnect().catch(() => {});
    }
    const resolvedDotPrisma = require.resolve('.prisma/client');
    if (resolvedDotPrisma && require.cache[resolvedDotPrisma]) {
      delete require.cache[resolvedDotPrisma];
    }
    const resolvedPrismaClient = require.resolve('@prisma/client');
    if (resolvedPrismaClient && require.cache[resolvedPrismaClient]) {
      delete require.cache[resolvedPrismaClient];
    }
    const { PrismaClient: FreshPrismaClient } = require('@prisma/client');
    const client = new FreshPrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
      globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
    }
    return client;
  } catch {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
      globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
    }
    return client;
  }
}

export const prisma = createPrismaClient();

export const DEFAULT_SIZES_JSON = JSON.stringify([
  { name: 'S (350ml)', price: -5000 },
  { name: 'M (500ml)', price: 0 },
  { name: 'L (700ml)', price: 7000 },
]);

export const DEFAULT_SUGAR_JSON = JSON.stringify([
  '0%',
  '30%',
  '50%',
  '70%',
  '100%',
]);

export const DEFAULT_ICE_JSON = JSON.stringify([
  '0% (Không đá)',
  '30% đá',
  '50% đá',
  '70% đá',
  '100% đá',
  'Đá riêng',
]);

export async function ensureInitialSeed() {
  if (globalForPrisma.seedVersion === PRISMA_SCHEMA_VERSION) return;
  globalForPrisma.seedVersion = PRISMA_SCHEMA_VERSION;

  try {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE [dbo].[Order] ALTER COLUMN [createdById] NVARCHAR(1000) NULL;
      `);
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`
        IF COL_LENGTH('dbo.Order', 'expectedDeliveryAt') IS NULL
        BEGIN
          ALTER TABLE [dbo].[Order] ADD [expectedDeliveryAt] DATETIME2 NULL;
        END
      `);
    } catch {}

    const userCount = await prisma.user.count();
    let adminUser: any = null;
    let staff1User: any = null;

    if (userCount === 0) {
      console.log('Seeding default NOCHA users...');
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: hashPassword('admin123'),
          displayName: 'Admin NOCHA',
          phone: '0989600992',
          role: 'ADMIN',
        },
      });

      staff1User = await prisma.user.create({
        data: {
          username: 'nv1',
          passwordHash: hashPassword('123456'),
          displayName: 'Nhân viên Pha chế 1',
          phone: '0989600992',
          role: 'STAFF',
        },
      });

      await prisma.user.create({
        data: {
          username: 'nv2',
          passwordHash: hashPassword('123456'),
          displayName: 'Nhân viên Bán hàng 2',
          phone: '0912345678',
          role: 'STAFF',
        },
      });
    } else {
      adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      staff1User = await prisma.user.findFirst({ where: { role: 'STAFF' } }) || adminUser;
    }

    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      console.log('Seeding default NOCHA categories & menu products...');
      const matchaCat = await prisma.category.create({
        data: {
          name: 'Matcha',
          slug: 'matcha',
          description: 'Trà xanh Matcha Nhật Bản nguyên chất — Thanh mát từ thiên nhiên',
          sortOrder: 1,
          isActive: true,
        },
      });

      const coffeeCat = await prisma.category.create({
        data: {
          name: 'Coffee',
          slug: 'coffee',
          description: 'Cà phê hạt rang mộc thơm đậm, tỉnh táo mỗi ngày',
          sortOrder: 2,
          isActive: true,
        },
      });

      const p1 = await prisma.product.create({
        data: {
          categoryId: matchaCat.id,
          name: 'Matcha Latte Caramel',
          description: 'Matcha Nhật Bản hòa quyện sữa tươi thanh mát và sốt Caramel béo thơm đặc trưng.',
          basePrice: 35000,
          imageUrl: '/images/products/matcha-latte-caramel.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 1,
          isActive: true,
        },
      });

      const p2 = await prisma.product.create({
        data: {
          categoryId: matchaCat.id,
          name: 'Coco Matcha',
          description: 'Nước dừa tươi mát lạnh kết hợp lớp kem Matcha sánh mịn thơm ngậy.',
          basePrice: 35000,
          imageUrl: '/images/products/coco-matcha.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 2,
          isActive: true,
        },
      });

      const p3 = await prisma.product.create({
        data: {
          categoryId: matchaCat.id,
          name: 'Matcha Latte',
          description: 'Hương vị Matcha truyền thống quyện cùng sữa tươi thanh dịu chuẩn vị.',
          basePrice: 30000,
          imageUrl: '/images/products/matcha-latte.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 3,
          isActive: true,
        },
      });

      const p4 = await prisma.product.create({
        data: {
          categoryId: matchaCat.id,
          name: 'Matcha Cold Whisk',
          description: 'Matcha đánh lạnh trực tiếp với sữa tạo độ sánh ngậy đậm đà khó quên.',
          basePrice: 35000,
          imageUrl: '/images/products/matcha-cold-whisk.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 4,
          isActive: true,
        },
      });

      await prisma.product.create({
        data: {
          categoryId: coffeeCat.id,
          name: 'Bạc Xỉu Kem Matcha',
          description: 'Sự giao thoa độc đáo giữa cà phê sữa Bạc Xỉu và lớp foam Matcha mịn màng.',
          basePrice: 32000,
          imageUrl: '/images/products/matcha-latte-caramel.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 1,
          isActive: true,
        },
      });

      await prisma.product.create({
        data: {
          categoryId: coffeeCat.id,
          name: 'Cà Phê Sữa Tươi',
          description: 'Cà phê phin đậm đà kết hợp sữa tươi nguyên kem béo nhẹ.',
          basePrice: 28000,
          imageUrl: '/images/products/matcha-latte.jpg',
          sizesJson: DEFAULT_SIZES_JSON,
          sugarOptionsJson: DEFAULT_SUGAR_JSON,
          iceOptionsJson: DEFAULT_ICE_JSON,
          sortOrder: 2,
          isActive: true,
        },
      });

      // Seed a couple of sample orders if none exist
      const orderCount = await prisma.order.count();
      if (orderCount === 0 && adminUser) {
        const now = new Date();
        await prisma.order.create({
          data: {
            orderCode: 'NC-0001',
            customerName: 'Chị Lan (S2.1805)',
            customerPhone: '0988112233',
            shippingAddress: 'P1805 Tòa S2 Goldmark City, 136 Hồ Tùng Mậu',
            note: 'Giao giờ nghỉ trưa giúp chị nhé',
            subtotalAmount: 105000,
            orderDiscount: 5000,
            netRevenue: 100000,
            isFreeShip: true,
            shippingFee: 0,
            finalAmount: 100000,
            status: 'COMPLETED',
            createdById: adminUser.id,
            createdAt: now,
            shippedAt: now,
            completedAt: now,
            items: {
              create: [
                {
                  productId: p1.id,
                  productName: p1.name,
                  productImage: p1.imageUrl,
                  quantity: 2,
                  preparedQty: 2,
                  selectedSize: 'M (500ml)',
                  sizeExtraPrice: 0,
                  selectedSugar: '70%',
                  selectedIce: '100% đá',
                  unitPrice: 35000,
                  itemDiscount: 0,
                  lineTotal: 70000,
                  note: '1 cốc ít sốt caramel hơn',
                },
                {
                  productId: p2.id,
                  productName: p2.name,
                  productImage: p2.imageUrl,
                  quantity: 1,
                  preparedQty: 1,
                  selectedSize: 'M (500ml)',
                  sizeExtraPrice: 0,
                  selectedSugar: '50%',
                  selectedIce: 'Đá riêng',
                  unitPrice: 35000,
                  itemDiscount: 0,
                  lineTotal: 35000,
                  note: 'Để đá riêng mang đi xa',
                },
              ],
            },
          },
        });

        if (staff1User) {
          await prisma.order.create({
            data: {
              orderCode: 'NC-0002',
              customerName: 'Anh Minh (R1.0912)',
              customerPhone: '0977665544',
              shippingAddress: 'Sảnh R1 Goldmark City, 136 Hồ Tùng Mậu',
              note: 'Gọi khi xuống sảnh',
              subtotalAmount: 65000,
              orderDiscount: 0,
              netRevenue: 65000,
              isFreeShip: false,
              shippingFee: 10000,
              finalAmount: 75000,
              status: 'CREATED',
              createdById: staff1User.id,
              createdAt: now,
              items: {
                create: [
                  {
                    productId: p3.id,
                    productName: p3.name,
                    productImage: p3.imageUrl,
                    quantity: 1,
                    preparedQty: 1,
                    selectedSize: 'M (500ml)',
                    sizeExtraPrice: 0,
                    selectedSugar: '70%',
                    selectedIce: '100% đá',
                    unitPrice: 30000,
                    itemDiscount: 0,
                    lineTotal: 30000,
                  },
                  {
                    productId: p4.id,
                    productName: p4.name,
                    productImage: p4.imageUrl,
                    quantity: 1,
                    preparedQty: 0,
                    selectedSize: 'M (500ml)',
                    sizeExtraPrice: 0,
                    selectedSugar: '50%',
                    selectedIce: '70% đá',
                    unitPrice: 35000,
                    itemDiscount: 0,
                    lineTotal: 35000,
                  },
                ],
              },
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error during initial seed:', err);
  }
}

export async function getActiveUserSession(req?: NextRequest): Promise<UserSession | null> {
  const session = await getSessionUser(req);
  if (!session) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isLocked: true,
        isDeleted: true,
      },
    });

    if (
      !dbUser ||
      dbUser.isLocked ||
      dbUser.isDeleted ||
      (dbUser.role !== 'ADMIN' && dbUser.role !== 'STAFF')
    ) {
      return null;
    }

    return {
      userId: dbUser.id,
      username: dbUser.username,
      displayName: dbUser.displayName,
      role: dbUser.role as 'ADMIN' | 'STAFF',
    };
  } catch {
    return null;
  }
}

let expectedDeliveryColumnReady = false;

export async function ensureExpectedDeliveryColumn() {
  if (expectedDeliveryColumnReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      IF COL_LENGTH('dbo.Order', 'expectedDeliveryAt') IS NULL
      BEGIN
        ALTER TABLE [dbo].[Order] ADD [expectedDeliveryAt] DATETIME2 NULL;
      END
    `);
    expectedDeliveryColumnReady = true;
  } catch (err) {
    console.error('Error ensuring expectedDeliveryAt column:', err);
  }
}

export async function setOrderExpectedDelivery(
  orderId: string,
  expectedDeliveryAt: string | Date | null | undefined
) {
  await ensureExpectedDeliveryColumn();
  if (!expectedDeliveryAt) {
    await prisma.$executeRaw`UPDATE [dbo].[Order] SET [expectedDeliveryAt] = NULL WHERE [id] = ${orderId}`;
    return null;
  }
  const parsed =
    expectedDeliveryAt instanceof Date ? expectedDeliveryAt : new Date(expectedDeliveryAt);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  await prisma.$executeRaw`UPDATE [dbo].[Order] SET [expectedDeliveryAt] = ${parsed} WHERE [id] = ${orderId}`;
  return parsed;
}

export async function attachExpectedDeliveryToOrders<T extends { id: string }>(
  orders: T[]
): Promise<(T & { expectedDeliveryAt: Date | null })[]> {
  await ensureExpectedDeliveryColumn();
  if (!orders || orders.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; expectedDeliveryAt: Date | null }>
    >`SELECT [id], [expectedDeliveryAt] FROM [dbo].[Order]`;
    const map = new Map<string, Date | null>();
    for (const r of rows) {
      map.set(r.id, r.expectedDeliveryAt ? new Date(r.expectedDeliveryAt) : null);
    }
    return orders.map((o) => ({
      ...o,
      expectedDeliveryAt: map.get(o.id) ?? null,
    }));
  } catch (err) {
    console.error('Error reading expectedDeliveryAt:', err);
    return orders.map((o) => ({ ...o, expectedDeliveryAt: null }));
  }
}

export async function getUrgent1HourOrderIds(
  sessionUserId: string,
  isAdmin: boolean,
  staffIdFilter?: string | null
): Promise<string[]> {
  await ensureExpectedDeliveryColumn();
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    // Bao gồm các đơn chưa giao xong có giờ hẹn giao <= 1 tiếng tới (kể cả đơn vừa mới quá giờ hẹn trong ngày mà chưa hoàn thành)
    const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        createdById: string | null;
        expectedDeliveryAt: Date | null;
      }>
    >`
      SELECT [id], [status], [createdById], [expectedDeliveryAt]
      FROM [dbo].[Order]
      WHERE [status] IN ('PENDING', 'CREATED', 'SHIPPING')
        AND [expectedDeliveryAt] IS NOT NULL
        AND [expectedDeliveryAt] >= ${windowStart}
        AND [expectedDeliveryAt] <= ${oneHourLater}
      ORDER BY [expectedDeliveryAt] ASC
    `;

    return rows
      .filter((r) => {
        if (isAdmin) {
          if (staffIdFilter) {
            return r.createdById === staffIdFilter;
          }
          return true;
        }
        // Nhân viên xem được đơn PENDING chung hoặc đơn do chính nhân viên đó phụ trách
        return r.status === 'PENDING' || r.createdById === sessionUserId;
      })
      .map((r) => r.id);
  } catch (err) {
    console.error('Error getting urgent 1h orders:', err);
    return [];
  }
}


