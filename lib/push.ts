import webpush from 'web-push';
import crypto from 'crypto';
import { prisma } from './db';

// ============================================================================
// WEB PUSH: lưu thiết bị đăng ký nhận thông báo & gửi thông báo khi có đơn mới
// ============================================================================

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@nocha.vn';

export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
export const pushPublicKey = VAPID_PUBLIC_KEY;

if (isPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

let pushTableReady = false;

export async function ensurePushTable() {
  if (pushTableReady) return;
  await prisma.$executeRawUnsafe(`
    IF OBJECT_ID('dbo.PushSubscription', 'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[PushSubscription] (
        [id] NVARCHAR(64) NOT NULL PRIMARY KEY,
        [userId] NVARCHAR(1000) NOT NULL,
        [endpoint] NVARCHAR(MAX) NOT NULL,
        [p256dh] NVARCHAR(500) NOT NULL,
        [auth] NVARCHAR(500) NOT NULL,
        [userAgent] NVARCHAR(500) NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
  `);
  pushTableReady = true;
}

// Endpoint có thể rất dài -> dùng hash làm khóa chính
const endpointId = (endpoint: string) =>
  crypto.createHash('sha256').update(endpoint).digest('hex');

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null
) {
  await ensurePushTable();
  const id = endpointId(sub.endpoint);
  const ua = (userAgent || '').slice(0, 500);
  await prisma.$executeRaw`
    MERGE [dbo].[PushSubscription] AS t
    USING (SELECT ${id} AS id) AS s ON t.[id] = s.id
    WHEN MATCHED THEN
      UPDATE SET [userId] = ${userId}, [p256dh] = ${sub.keys.p256dh}, [auth] = ${sub.keys.auth},
                 [userAgent] = ${ua}, [updatedAt] = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT ([id], [userId], [endpoint], [p256dh], [auth], [userAgent])
      VALUES (${id}, ${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${ua});
  `;
}

export async function deletePushSubscription(endpoint: string) {
  await ensurePushTable();
  const id = endpointId(endpoint);
  await prisma.$executeRaw`DELETE FROM [dbo].[PushSubscription] WHERE [id] = ${id}`;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Gửi thông báo tới tất cả thiết bị đã đăng ký của nhân viên / admin còn hoạt động.
 * Tự dọn các đăng ký đã hết hạn (404 / 410).
 */
export async function sendPushToStaff(payload: PushPayload, onlyUserId?: string) {
  if (!isPushConfigured) return { sent: 0, failed: 0 };
  await ensurePushTable();

  const rows = onlyUserId
    ? await prisma.$queryRaw<Array<{ id: string; endpoint: string; p256dh: string; auth: string }>>`
        SELECT s.[id], s.[endpoint], s.[p256dh], s.[auth]
        FROM [dbo].[PushSubscription] s
        INNER JOIN [dbo].[User] u ON u.[id] = s.[userId]
        WHERE u.[isLocked] = 0 AND u.[isDeleted] = 0 AND u.[id] = ${onlyUserId}
      `
    : await prisma.$queryRaw<Array<{ id: string; endpoint: string; p256dh: string; auth: string }>>`
        SELECT s.[id], s.[endpoint], s.[p256dh], s.[auth]
        FROM [dbo].[PushSubscription] s
        INNER JOIN [dbo].[User] u ON u.[id] = s.[userId]
        WHERE u.[isLocked] = 0 AND u.[isDeleted] = 0
      `;

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          body,
          { TTL: 60 * 60, urgency: 'high' }
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.$executeRaw`DELETE FROM [dbo].[PushSubscription] WHERE [id] = ${r.id}`;
        } else {
          console.error('Web push error:', err?.statusCode, err?.body || err?.message);
        }
      }
    })
  );

  return { sent, failed };
}
