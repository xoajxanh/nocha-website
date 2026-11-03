'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Leaf,
  PhoneCall,
  MapPin,
  LogIn,
  LayoutDashboard,
  Sparkles,
  Coffee,
  CheckCircle2,
  Clock,
  Heart,
  ShoppingBag,
} from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeProvider';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});

    fetch('/api/public/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMenu(false));
  }, []);

  const displayedCategories =
    activeCategoryId === 'ALL'
      ? categories
      : categories.filter((c) => c.id === activeCategoryId);

  const parseJsonSafe = (str: string, fallback: any) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-main)]/90 border-b border-[var(--border-color)] w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <img
              src="/images/logo.png"
              alt="Matcha NOCHA Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain shadow-md group-hover:scale-105 transition shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-2xl tracking-wider text-matcha-700 dark:text-matcha-400 leading-none">
                  NOCHA
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-matcha-100 dark:bg-matcha-900 text-matcha-700 dark:text-matcha-300 font-bold border border-matcha-300 dark:border-matcha-700">
                  FRESH
                </span>
              </div>
              <span className="block text-[10px] sm:text-xs font-semibold tracking-wider text-[var(--text-muted)] truncate">
                Matcha &amp; Coffee
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
            <a href="#menu" className="hover:text-matcha-600 dark:hover:text-matcha-400 transition">
              Thực Đơn Hôm Nay
            </a>
            <Link
              href="/order"
              className="text-matcha-600 dark:text-matcha-400 hover:underline flex items-center gap-1"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Đặt Món Online</span>
            </Link>
            <a href="#poster" className="hover:text-matcha-600 dark:hover:text-matcha-400 transition">
              Menu Nguyên Bản
            </a>
            <a href="#contact" className="hover:text-matcha-600 dark:hover:text-matcha-400 transition">
              Liên Hệ &amp; Địa Chỉ
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggleButton />

            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl matcha-gradient-btn font-black text-xs sm:text-sm shadow-md whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>ORDER NGAY</span>
            </Link>

            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs sm:text-sm"
                title="Quản Trị"
              >
                <LayoutDashboard className="w-4 h-4 text-matcha-600 shrink-0" />
                <span className="hidden sm:inline">Quản Trị</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs sm:text-sm"
                title="Đăng Nhập"
              >
                <LogIn className="w-4 h-4 text-matcha-600 shrink-0" />
                <span className="hidden sm:inline">Đăng Nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-7 min-w-0 space-y-5 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-matcha-100 dark:bg-matcha-900/60 border border-matcha-300 dark:border-matcha-700 text-matcha-700 dark:text-matcha-300 text-[10px] sm:text-xs font-bold tracking-wider uppercase max-w-full">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">GOOD MATCHA BRIGHTER DAYS • PURE MATCHA</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text-main)] leading-tight">
              NOCHA <br className="hidden sm:inline" />
              <span className="text-matcha-600 dark:text-matcha-400">
                Thanh Mát Từ Thiên Nhiên
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Thưởng thức hương vị trà xanh Matcha Nhật Bản nguyên chất &amp; Cà phê tươi mới mỗi ngày.
              Đặt đơn trực tuyến chỉ trong 30 giây — Nhân viên NOCHA sẽ gọi điện xác nhận và giao tận nơi!
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                href="/order"
                className="px-8 py-4 rounded-2xl matcha-gradient-btn font-black text-sm sm:text-base shadow-xl flex items-center gap-2.5 transform hover:scale-105 transition"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>ORDER NGAY TRÊN WEB</span>
              </Link>

              <a
                href="#menu"
                className="px-6 py-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold text-sm border border-[var(--border-color)] shadow-sm flex items-center gap-2 transition"
              >
                <Coffee className="w-4 h-4 text-matcha-600" />
                <span>Xem Thực Đơn</span>
              </a>
            </div>

            {/* Quick Info Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="nocha-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 text-matcha-600 dark:text-matcha-400 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold">100% Pure Matcha</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Trà xanh tự nhiên</div>
                </div>
              </div>

              <div className="nocha-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 text-matcha-600 dark:text-matcha-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold">Giao Nhanh Tận Nơi</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Goldmark City &amp; Khu vực</div>
                </div>
              </div>

              <div className="nocha-card p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 text-matcha-600 dark:text-matcha-400 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold">Tuỳ Chọn Ngọt / Đá</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Size S, M (500ml), L</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Featured Showcase */}
          <div className="lg:col-span-5">
            <div className="nocha-card p-5 sm:p-6 relative overflow-hidden border-2 border-matcha-300 dark:border-matcha-700 shadow-xl">
              <div className="text-center pb-4 border-b border-[var(--border-color)]">
                <div className="text-xs font-bold tracking-widest uppercase text-matcha-600 dark:text-matcha-400">
                  NOCHA SIGNATURE
                </div>
                <h2 className="text-2xl font-black mt-0.5">MATCHA MENU</h2>
                <p className="text-[11px] tracking-widest uppercase text-[var(--text-muted)] mt-0.5">
                  THANH MÁT TỪ THIÊN NHIÊN
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-5">
                {[
                  {
                    name: 'Matcha Latte Caramel',
                    price: '35k',
                    img: '/images/products/matcha-latte-caramel.jpg',
                  },
                  {
                    name: 'Coco Matcha',
                    price: '35k',
                    img: '/images/products/coco-matcha.jpg',
                  },
                  {
                    name: 'Matcha Latte',
                    price: '30k',
                    img: '/images/products/matcha-latte.jpg',
                  },
                  {
                    name: 'Matcha Cold whisk',
                    price: '35k',
                    img: '/images/products/matcha-cold-whisk.jpg',
                  },
                ].map((item, i) => (
                  <Link
                    href="/order"
                    key={i}
                    className="rounded-2xl bg-[var(--bg-subtle)] p-3 text-center border border-[var(--border-color)] hover:border-matcha-500 hover:shadow-md transition group"
                  >
                    <div className="h-36 sm:h-40 rounded-xl overflow-hidden bg-[#fbf8f1] mb-2.5 flex items-center justify-center p-2.5">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="max-h-full max-w-[82%] w-auto h-auto object-contain rounded-lg group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm line-clamp-1">
                      {item.name}
                    </div>
                    <div className="text-base sm:text-lg font-black text-matcha-600 dark:text-matcha-400 mt-0.5">
                      {item.price}
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/order"
                className="w-full py-3 rounded-xl matcha-gradient-btn font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>BẤM ĐẶT MÓN NGAY</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Menu Section from Database */}
      <section id="menu" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-matcha-600 dark:text-matcha-400">
              THỰC ĐƠN TRỰC TUYẾN
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">
              Khám Phá Đồ Uống NOCHA
            </h2>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategoryId('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCategoryId === 'ALL'
                  ? 'matcha-gradient-btn text-white shadow-sm'
                  : 'nocha-card text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Tất Cả Món
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeCategoryId === cat.id
                    ? 'matcha-gradient-btn text-white shadow-sm'
                    : 'nocha-card text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {loadingMenu ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            Đang tải thực đơn tươi mát...
          </div>
        ) : (
          <div className="space-y-10">
            {displayedCategories.map((cat) => (
              <div key={cat.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                  <div>
                    <h3 className="text-xl font-black text-matcha-700 dark:text-matcha-400 flex items-center gap-2">
                      <Leaf className="w-5 h-5" />
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-matcha-100 dark:bg-matcha-900/60 text-matcha-700 dark:text-matcha-300">
                    {cat.products?.length || 0} món
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {cat.products?.map((prod: any) => {
                    const sizes = parseJsonSafe(prod.sizesJson, []);
                    const sugars = parseJsonSafe(prod.sugarOptionsJson, []);
                    return (
                      <div
                        key={prod.id}
                        className="nocha-card overflow-hidden flex flex-col justify-between group hover:shadow-lg transition duration-200"
                      >
                        <div>
                          <div className="h-48 bg-[#fbf8f1] dark:bg-[#17261b] overflow-hidden relative flex items-center justify-center p-4">
                            <img
                              src={prod.imageUrl || '/images/products/matcha-latte.jpg'}
                              alt={prod.name}
                              className="max-h-full max-w-[75%] w-auto h-auto object-contain rounded-xl group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-matcha-700/90 text-white backdrop-blur-sm">
                              {cat.name}
                            </span>
                          </div>

                          <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-extrabold text-base">{prod.name}</h4>
                              <span className="font-black text-base text-matcha-600 dark:text-matcha-400 whitespace-nowrap">
                                {(prod.basePrice || 0).toLocaleString('vi-VN')}đ
                              </span>
                            </div>

                            {prod.description && (
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                {prod.description}
                              </p>
                            )}

                            <div className="pt-2 space-y-1.5 text-[11px]">
                              {sizes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="font-bold text-[var(--text-muted)]">Size:</span>
                                  {sizes.map((s: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-matcha-700 dark:text-matcha-300 font-semibold"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {sugars.length > 0 && (
                                <div className="text-[var(--text-muted)] truncate">
                                  <strong className="font-semibold">Đường / Đá:</strong> Tuỳ chọn{' '}
                                  {sugars.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-1">
                          <Link
                            href={`/order?product=${prod.id}`}
                            className="w-full py-2.5 rounded-xl matcha-gradient-btn font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Order Ngay Món Này</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Poster & Contact Section */}
      <section id="poster" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div id="contact" className="nocha-card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-matcha-100 dark:bg-matcha-900/60 text-matcha-700 dark:text-matcha-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-matcha-600" />
              <span>THÔNG TIN LIÊN HỆ &amp; ĐẶT ĐƠN</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black">
              NOCHA — Matcha &amp; Coffee
            </h3>

            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Nhận đơn giao nhanh tận phòng/sảnh tại khu đô thị Goldmark City và khu vực Phú Diễn, Hồ Tùng Mậu, Cầu Giấy, Bắc Từ Liêm.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <div className="w-11 h-11 rounded-xl matcha-gradient-btn text-white flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] font-semibold">Hotline / Zalo Đặt Nước</div>
                  <a
                    href="tel:0989600992"
                    className="text-lg font-black text-matcha-700 dark:text-matcha-300 hover:underline"
                  >
                    0989600992
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <div className="w-11 h-11 rounded-xl matcha-gradient-btn text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] font-semibold">Địa chỉ Cửa hàng</div>
                  <div className="text-sm sm:text-base font-extrabold">
                    Tòa S2 Goldmark City, 136 Hồ Tùng Mậu, Phú Diễn, Hà Nội
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/order"
                className="px-6 py-3 rounded-xl matcha-gradient-btn font-black text-xs sm:text-sm shadow-md flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ORDER NGAY DÀNH CHO KHÁCH</span>
              </Link>
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-5 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs sm:text-sm"
                >
                  Vào Trang Quản Trị
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-5 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs sm:text-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Nhân Viên / Admin</span>
                </Link>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="max-w-sm w-full rounded-2xl overflow-hidden shadow-xl border-2 border-matcha-300 dark:border-matcha-700">
              <img
                src="/images/menu-nocha.jpg"
                alt="Menu NOCHA Matcha & Coffee"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border-color)] py-6 px-4 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-bold text-matcha-700 dark:text-matcha-400">
            © {new Date().getFullYear()} NOCHA — Matcha &amp; Coffee. All rights reserved.
          </div>
          <div>
            Hotline: <strong>0989600992</strong> • Tòa S2 Goldmark City, 136 Hồ Tùng Mậu, Phú Diễn, HN
          </div>
        </div>
      </footer>
    </div>
  );
}
