/* NOCHA Service Worker — nhận thông báo đẩy khi có đơn mới */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'NOCHA', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '🔔 Đơn mới — NOCHA';
  const options = {
    body: data.body || 'Có đơn hàng mới đang chờ xác nhận',
    icon: '/images/logo.png',
    badge: '/favicon.png',
    tag: data.tag || 'nocha-order',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/orders' },
  };

  event.waitUntil(
    (async () => {
      // Báo cho các tab đang mở để kêu chuông & tải lại danh sách ngay lập tức
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach((c) => c.postMessage({ type: 'NOCHA_NEW_ORDER', payload: data }));
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || '/orders',
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch (e) {}
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
