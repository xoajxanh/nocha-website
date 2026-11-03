'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Coffee,
  FolderTree,
  Users,
  User,
  Leaf,
  PhoneCall,
  MapPin,
  Warehouse,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  Boxes,
  Layers,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface SidebarProps {
  userRole?: 'ADMIN' | 'STAFF';
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { isDesktopSidebarOpen } = useTheme();
  const isInventoryActive = pathname.startsWith('/inventory');
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);

  const navItems = [
    { label: 'Dashboard Thống Kê', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Lên Đơn Mới (POS)', href: '/orders/create', icon: PlusCircle, highlight: true },
    { label: 'Đơn Hàng & Pha Chế', href: '/orders', icon: ShoppingBag },
    ...(userRole === 'ADMIN'
      ? [
          { label: 'Quản Lý Sản Phẩm', href: '/products', icon: Coffee },
          { label: 'Quản Lý Danh Mục', href: '/categories', icon: FolderTree },
          { label: 'Tài Khoản Nhân Viên', href: '/users', icon: Users },
        ]
      : []),
    { label: 'Cá Nhân & Mật Khẩu', href: '/profile', icon: User },
  ];

  const inventorySubItems = [
    { label: 'Quản lý nhập kho', href: '/inventory', icon: PackagePlus },
    { label: 'Quản lý sản phẩm', href: '/inventory/items', icon: Boxes },
    { label: 'Quản lý danh mục', href: '/inventory/categories', icon: Layers },
  ];

  if (!isDesktopSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 nocha-panel border-r border-[var(--border-color)] flex-col shrink-0 hidden xl:flex h-screen overflow-hidden select-none">
      {/* Header bên Sidebar có đúng h-16 (64px) bằng khít với Navbar Header */}
      <div className="h-16 px-5 border-b border-[var(--border-color)] flex items-center shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/images/logo.png"
            alt="Matcha NOCHA Logo"
            className="w-11 h-11 rounded-full object-contain shadow-sm shrink-0 group-hover:scale-105 transition"
          />
          <div>
            <h1 className="font-black text-lg tracking-wider text-matcha-700 dark:text-matcha-400 leading-none">
              NOCHA
            </h1>
            <p className="text-[11px] font-bold text-[var(--text-muted)] mt-0.5">
              Matcha &amp; Coffee POS
            </p>
          </div>
        </Link>
      </div>

      {/* Phần danh sách menu tự cuộn nếu màn hình thấp */}
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/orders' && item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'matcha-gradient-btn text-white shadow-md'
                  : item.highlight
                  ? 'bg-matcha-100 dark:bg-matcha-900/50 text-matcha-700 dark:text-matcha-300 hover:bg-matcha-200/80 dark:hover:bg-matcha-800/60 border border-matcha-300 dark:border-matcha-700'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-matcha-600 dark:text-matcha-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Phân hệ Quản Lý Kho (Chỉ dành cho Admin) */}
        {userRole === 'ADMIN' && (
          <div className="pt-1 space-y-1">
            <button
              type="button"
              onClick={() => setIsInventoryOpen(!isInventoryOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isInventoryActive
                  ? 'bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-200 border border-matcha-300 dark:border-matcha-700'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Warehouse className="w-4 h-4 shrink-0 text-matcha-600 dark:text-matcha-400" />
                <span className="truncate">Quản Lý Kho</span>
              </div>
              {isInventoryOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
              )}
            </button>

            {isInventoryOpen && (
              <div className="pl-4 space-y-1 border-l-2 border-matcha-300/60 dark:border-matcha-800 ml-5">
                {inventorySubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const subActive = pathname === sub.href;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        subActive
                          ? 'matcha-gradient-btn text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <SubIcon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          subActive ? 'text-white' : 'text-matcha-600 dark:text-matcha-400'
                        }`}
                      />
                      <span className="truncate">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Khung địa chỉ cố định ở đáy (bottom của 100vh) */}
      <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0 mt-auto">
        <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-matcha-700 dark:text-matcha-400 font-extrabold">
            <Leaf className="w-4 h-4 shrink-0" />
            <span>NOCHA Matcha &amp; Coffee</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-main)]">
            <PhoneCall className="w-3.5 h-3.5 text-matcha-600 dark:text-matcha-400 shrink-0" />
            <span>0989600992</span>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)] leading-snug">
            <MapPin className="w-3.5 h-3.5 text-matcha-600 dark:text-matcha-400 shrink-0 mt-0.5" />
            <span>Tòa S2 Goldmark City, 136 Hồ Tùng Mậu, Phú Diễn, HN</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
