'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  ShieldCheck,
  KeyRound,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Coffee,
  FolderTree,
  Users,
  Leaf,
  ExternalLink,
  PhoneCall,
  MapPin,
  Warehouse,
  PackagePlus,
  Boxes,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { UserSession } from '@/lib/auth';
import { ThemeToggleButton, useTheme } from './ThemeProvider';
import OrderNotifier from './OrderNotifier';

interface NavbarProps {
  user: UserSession | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const { isDesktopSidebarOpen, toggleDesktopSidebar } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: 'Dashboard Thống Kê', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Lên Đơn Mới (POS)', href: '/orders/create', icon: PlusCircle },
    { label: 'Đơn Hàng & Pha Chế', href: '/orders', icon: ShoppingBag },
    ...(user?.role === 'ADMIN'
      ? [
          { label: 'Quản Lý Sản Phẩm', href: '/products', icon: Coffee },
          { label: 'Quản Lý Danh Mục', href: '/categories', icon: FolderTree },
          { label: 'Tài Khoản Nhân Viên', href: '/users', icon: Users },
        ]
      : []),
    { label: 'Cá Nhân & Mật Khẩu', href: '/profile', icon: User },
  ];

  return (
    <>
      {/* Header cố định h-16 (64px) đồng bộ tuyệt đối với Sidebar Header */}
      <header className="h-16 shrink-0 nocha-panel border-b border-[var(--border-color)] px-3 sm:px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Nút mở Drawer trên Mobile + iPad Mini + iPad Pro (< xl: 1280px) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-main)] hover:opacity-80 xl:hidden transition flex items-center justify-center shrink-0 border border-[var(--border-color)]"
            aria-label="Mở menu điều hướng"
            title="Mở Menu"
          >
            <Menu className="w-5 h-5 text-matcha-600 dark:text-matcha-400" />
          </button>

          {/* Nút Ẩn/Hiện Sidebar trên màn hình lớn (>= xl: 1280px) */}
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="hidden xl:flex p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-main)] hover:opacity-80 transition items-center justify-center shrink-0 border border-[var(--border-color)]"
            title={isDesktopSidebarOpen ? 'Thu gọn thanh bên (Mở rộng không gian)' : 'Hiện thanh bên'}
          >
            {isDesktopSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-matcha-600 dark:text-matcha-400" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-matcha-600 dark:text-matcha-400" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
            <img
              src="/images/logo.png"
              alt="Matcha NOCHA Logo"
              className="w-9 h-9 rounded-full object-contain xl:hidden shrink-0 shadow-sm"
            />
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-extrabold text-matcha-800 dark:text-matcha-300 text-xs sm:text-sm md:text-base truncate">
                NOCHA — Matcha &amp; Coffee
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-matcha-100 dark:bg-matcha-900/70 text-matcha-700 dark:text-matcha-300 border border-matcha-300 dark:border-matcha-700 font-bold whitespace-nowrap shrink-0">
                Xem Menu Online <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {user && <OrderNotifier />}
          <ThemeToggleButton />

          {user && (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  user.role === 'ADMIN'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-matcha-500 text-white shadow-sm'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">
                  {user.role === 'ADMIN' ? 'Quản Trị Viên' : 'Nhân Viên'}
                </span>
                <span className="lg:hidden">{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</span>
              </span>

              <div className="hidden sm:flex items-center gap-2 border-l border-[var(--border-color)] pl-2.5">
                <div className="w-8 h-8 rounded-full matcha-gradient-btn text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left max-w-[130px]">
                  <div className="text-xs font-bold leading-tight truncate">{user.displayName}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">@{user.username}</div>
                </div>
              </div>

              <Link
                href="/profile"
                className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 text-[var(--text-muted)] border border-[var(--border-color)] transition shrink-0"
                title="Đổi thông tin / Mật khẩu"
              >
                <KeyRound className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Slide-over Sidebar Drawer cho Mobile, iPad Mini & iPad Pro (< xl) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] nocha-panel border-r border-[var(--border-color)] h-full flex flex-col z-10 shadow-2xl">
            <div className="h-16 px-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <img
                  src="/images/logo.png"
                  alt="Matcha NOCHA Logo"
                  className="w-10 h-10 rounded-full object-contain shrink-0"
                />
                <div>
                  <h3 className="font-black text-base text-matcha-700 dark:text-matcha-400 leading-none">
                    NOCHA
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-0.5">
                    Matcha &amp; Coffee POS
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl matcha-gradient-btn text-white flex items-center justify-center font-bold text-base shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{user.displayName}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">@{user.username}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-matcha-500 text-white">
                      {user.role === 'ADMIN' ? 'Quản Trị Viên' : 'Nhân Viên'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/orders' && item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'matcha-gradient-btn text-white shadow-md'
                        : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-matcha-600 dark:text-matcha-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {user?.role === 'ADMIN' && (
                <div className="pt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                      pathname.startsWith('/inventory')
                        ? 'bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-200 border border-matcha-300 dark:border-matcha-700'
                        : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Warehouse className="w-4 h-4 text-matcha-600 dark:text-matcha-400" />
                      <span>Quản Lý Kho</span>
                    </div>
                    {isInventoryOpen ? (
                      <ChevronDown className="w-4 h-4 opacity-70" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    )}
                  </button>

                  {isInventoryOpen && (
                    <div className="pl-3.5 space-y-1 border-l-2 border-matcha-300/60 dark:border-matcha-800 ml-4">
                      {[
                        { label: 'Quản lý nhập kho', href: '/inventory', icon: PackagePlus },
                        { label: 'Quản lý sản phẩm', href: '/inventory/items', icon: Boxes },
                        { label: 'Quản lý danh mục', href: '/inventory/categories', icon: Layers },
                      ].map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              subActive
                                ? 'matcha-gradient-btn text-white shadow-sm'
                                : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <SubIcon
                              className={`w-3.5 h-3.5 ${
                                subActive ? 'text-white' : 'text-matcha-600 dark:text-matcha-400'
                              }`}
                            />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-matcha-700 dark:text-matcha-400 hover:bg-[var(--bg-subtle)]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Xem Trang Chủ Menu Online</span>
              </Link>
            </nav>

            {/* Khung địa chỉ cố định ở đáy Drawer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0 mt-auto space-y-2.5">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[11px] space-y-1">
                <div className="font-extrabold text-matcha-700 dark:text-matcha-400 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> NOCHA Matcha &amp; Coffee
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-main)] font-semibold">
                  <PhoneCall className="w-3 h-3 text-matcha-600 shrink-0" /> 0989600992
                </div>
                <div className="flex items-start gap-1.5 text-[var(--text-muted)] leading-snug">
                  <MapPin className="w-3 h-3 text-matcha-600 shrink-0 mt-0.5" />
                  <span>Tòa S2 Goldmark City, 136 Hồ Tùng Mậu, Phú Diễn, HN</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
