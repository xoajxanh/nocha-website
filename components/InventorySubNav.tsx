'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PackagePlus, Boxes, Layers } from 'lucide-react';

export default function InventorySubNav() {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Quản Lý Nhập Kho',
      href: '/inventory',
      icon: PackagePlus,
    },
    {
      label: 'Sản Phẩm Kho (Nguyên Liệu / Đồ Dùng / Dịch Vụ)',
      href: '/inventory/items',
      icon: Boxes,
    },
    {
      label: 'Danh Mục Kho',
      href: '/inventory/categories',
      icon: Layers,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm w-fit max-w-full">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
              active
                ? 'matcha-gradient-btn text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

