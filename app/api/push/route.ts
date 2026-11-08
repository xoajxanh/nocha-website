import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserSession } from '@/lib/db';
import {
  isPushConfigured,
  pushPublicKey,
  savePushSubscription,
  deletePushSubscription,
  sendPushToStaff,
} from '@/lib/push';

export const dynamic = 'force-dynamic';

// GET: lấy public key để trình duyệt đăng ký nhận thông báo
export async function GET(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  return NextResponse.json({ enabled: isPushConfigured, publicKey: pushPublicKey });
}

// POST: { action: 'SUBSCRIBE', subscription } | { action: 'TEST' }
export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  if (!isPushConfigured) {
    return NextResponse.json(
      { error: 'Server chưa cấu hình VAPID key cho thông báo đẩy' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === 'TEST') {
    const result = await sendPushToStaff(
      {
        title: '🔔 Thông báo thử — NOCHA',
        body: 'Thiết bị này đã nhận được thông báo đơn mới!',
        url: '/orders',
        tag: 'nocha-test',
      },
      session.userId
    );
    return NextResponse.json({ success: true, ...result });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Dữ liệu đăng ký không hợp lệ' }, { status: 400 });
  }

  await savePushSubscription(session.userId, sub, req.headers.get('user-agent'));
  return NextResponse.json({ success: true });
}

// DELETE: { endpoint } — hủy nhận thông báo trên thiết bị này
export async function DELETE(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.endpoint) await deletePushSubscription(String(body.endpoint));
  return NextResponse.json({ success: true });
}
