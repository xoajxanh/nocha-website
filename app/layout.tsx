import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'NOCHA — Matcha & Coffee | Thanh Mát Từ Thiên Nhiên',
  description:
    'NOCHA Matcha & Coffee - Tòa S2 Goldmark City, 136 Hồ Tùng Mậu, Phú Diễn, HN. Hotline: 0989600992.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

