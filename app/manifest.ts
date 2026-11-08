import type { MetadataRoute } from 'next';

// Manifest PWA: bắt buộc để iPad/iPhone (iOS 16.4+) cho phép nhận thông báo đẩy
// khi web được "Thêm vào Màn hình chính".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NOCHA — Matcha & Coffee POS',
    short_name: 'NOCHA POS',
    description: 'Quản lý đơn hàng, pha chế & kho NOCHA Matcha & Coffee',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f6f8f3',
    theme_color: '#21853b',
    icons: [
      { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/logo.png', sizes: '934x934', type: 'image/png', purpose: 'any' },
    ],
  };
}
