'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Phone,
  MapPin,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  PhoneIncoming,
} from 'lucide-react';

const PAGE_LIMIT = 20;

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [urgentCount, setUrgentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Server-side Filter & Pagination States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    totalItems: 0,
    totalPages: 1,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 1. Check Auth once on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // 2. Fetch orders from server whenever user, statusFilter, appliedSearch, or page changes
  const fetchOrdersFromServer = useCallback(
    async (targetStatus: string, targetSearch: string, targetPage: number) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_LIMIT),
        });
        if (targetStatus && targetStatus !== 'ALL') {
          params.set('status', targetStatus);
        }
        if (targetSearch.trim()) {
          params.set('search', targetSearch.trim());
        }

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setOrders(json.orders || []);
          setPendingCount(Number(json.pendingCount) || 0);
          setUrgentCount(Number(json.urgentCount) || 0);
          if (json.pagination) {
            setPagination(json.pagination);
          }
        }
      } catch (e) {
        console.error('Failed to load orders:', e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user) return;
    fetchOrdersFromServer(statusFilter, appliedSearch, page);
  }, [user, statusFilter, appliedSearch, page, fetchOrdersFromServer]);

  const handleStatusTabChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setPage(1);
  };

  const getProductAvatar = (productImage?: string | null, productName?: string | null) => {
    if (productImage && productImage.trim()) return productImage;
    const name = (productName || '').toLowerCase();
    if (name.includes('coco')) return '/images/products/coco-matcha.jpg';
    if (name.includes('cold') || name.includes('whisk'))
      return '/images/products/matcha-cold-whisk.jpg';
    if (name.includes('caramel') || name.includes('oatside') || name.includes('bạc xỉu'))
      return '/images/products/matcha-latte-caramel.jpg';
    return '/images/products/matcha-latte.jpg';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-sm animate-pulse">
            <PhoneIncoming className="w-3 h-3" />
            <span>Chờ xác nhận</span>
          </span>
        );
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
            <Clock className="w-3 h-3" />
            <span>Đã tạo đơn</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white">
            <Truck className="w-3 h-3" />
            <span>Đang giao</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getCardAccentClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'border-l-4 border-l-purple-500 dark:border-l-purple-500';
      case 'CREATED':
        return 'border-l-4 border-l-amber-400 dark:border-l-amber-400';
      case 'SHIPPING':
        return 'border-l-4 border-l-sky-500 dark:border-l-sky-500';
      case 'COMPLETED':
        return 'border-l-4 border-l-emerald-500 dark:border-l-emerald-500';
      case 'CANCELLED':
        return 'border-l-4 border-l-rose-500 dark:border-l-rose-500 opacity-80';
      default:
        return '';
    }
  };

  if (!user) return null;

  const startIdx = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.totalItems, pagination.page * pagination.limit);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-3 sm:p-5 flex-1 flex flex-col min-h-0 overflow-hidden gap-3">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          {/* 1. COMPACT HEADER TITLE */}
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h1 className="text-base sm:text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-matcha-500 shrink-0" />
                <span>Danh Sách Đơn Hàng</span>
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">
                Bấm vào từng bill đơn hàng để xem chi tiết, đánh dấu pha chế hoặc xử lý trạng thái
              </p>
            </div>

            <Link
              href="/orders/create"
              className="px-3.5 py-1.5 rounded-xl matcha-gradient-btn font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo đơn mới</span>
            </Link>
          </div>

          {/* 2. COMPACT FILTER TABS & SEARCH BAR */}
          <div className="nocha-card p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              {[
                { key: 'ALL', label: 'Tất cả' },
                {
                  key: 'URGENT_1H',
                  label: '🔥 Giao 1h tới',
                  badge: urgentCount,
                  badgeColor: 'bg-rose-600 text-white animate-pulse',
                },
                {
                  key: 'PENDING',
                  label: 'Chờ xác nhận',
                  badge: pendingCount,
                  badgeColor: 'bg-purple-600 text-white animate-pulse',
                },
                { key: 'CREATED', label: 'Đã tạo đơn' },
                { key: 'SHIPPING', label: 'Đang giao' },
                { key: 'COMPLETED', label: 'Hoàn thành' },
                { key: 'CANCELLED', label: 'Đã hủy' },
              ].map((tab: any) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusTabChange(tab.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    statusFilter === tab.key
                      ? 'matcha-gradient-btn text-white shadow-sm'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        tab.badgeColor || 'bg-purple-600 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-1.5 w-full lg:w-auto"
            >
              <div className="relative flex-1 lg:w-64">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tên khách, SĐT hoặc địa chỉ..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-medium focus:outline-none focus:border-matcha-500"
                />
                {(searchInput || appliedSearch) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold shrink-0"
              >
                Tìm
              </button>
            </form>
          </div>

          {/* 3. SCROLLABLE CLEAN BILL CARDS LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
            {loading ? (
              <div className="nocha-card p-10 text-center text-xs text-[var(--text-muted)]">
                Đang tải danh sách đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="nocha-card p-10 text-center space-y-2.5">
                <Coffee className="w-8 h-8 text-matcha-500 mx-auto opacity-60" />
                <div className="text-xs font-bold">
                  Không tìm thấy đơn hàng nào khớp bộ lọc hiện tại
                </div>
                {(statusFilter !== 'ALL' || appliedSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      handleClearSearch();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[11px] font-bold"
                  >
                    Xem lại tất cả đơn
                  </button>
                )}
              </div>
            ) : (
              orders.map((order) => {
                const totalCups = (order.items || []).reduce(
                  (s: number, it: any) => s + (it.quantity || 0),
                  0
                );
                const preparedCups = (order.items || []).reduce(
                  (s: number, it: any) => s + (it.preparedQty || 0),
                  0
                );
                const allPrepared = totalCups > 0 && preparedCups >= totalCups;
                const isUrgent =
                  order.expectedDeliveryAt &&
                  order.status !== 'COMPLETED' &&
                  order.status !== 'CANCELLED' &&
                  new Date(order.expectedDeliveryAt).getTime() <= Date.now() + 60 * 60 * 1000;

                // Tự động gom theo món để hiển thị ngoài danh sách gọn gàng
                const groupedItemsMap = new Map<
                  string,
                  {
                    key: string;
                    productName: string;
                    productImage: string | null;
                    totalQty: number;
                  }
                >();

                for (const it of order.items || []) {
                  const gKey =
                    it.productId || (it.productName || 'Sản phẩm').trim().toLowerCase();
                  const found = groupedItemsMap.get(gKey);
                  if (found) {
                    found.totalQty += Number(it.quantity) || 0;
                  } else {
                    groupedItemsMap.set(gKey, {
                      key: gKey,
                      productName: it.productName || 'Sản phẩm',
                      productImage: it.productImage || null,
                      totalQty: Number(it.quantity) || 0,
                    });
                  }
                }
                const groupedOrderItems = Array.from(groupedItemsMap.values());

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/order/${order.id}`)}
                    className={`nocha-card dark:border-[#838383] p-3 sm:px-4 sm:py-3 cursor-pointer hover:border-matcha-500/60 hover:bg-[var(--bg-subtle)] transition space-y-2 ${getCardAccentClass(
                      order.status
                    )}`}
                  >
                    {/* HÀNG 1 (QUAN TRỌNG NHẤT): TÊN KHÁCH + SĐT + GIỜ HẸN SÁT MÉP PHẢI, ĐỊA CHỈ & GHI CHÚ RIÊNG DÒNG */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1.5 font-black text-sm sm:text-base text-[var(--text-main)]">
                            <User className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                            <span>{order.customerName}</span>
                          </span>

                          <a
                            href={`tel:${order.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-matcha-500/10 hover:bg-matcha-500/20 text-matcha-700 dark:text-matcha-300 font-bold text-xs transition"
                            title="Gọi điện cho khách"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>

                        {order.expectedDeliveryAt && (
                          <span
                            className={`ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isUrgent
                                ? 'bg-rose-600 text-white'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              Hẹn:{' '}
                              {new Date(order.expectedDeliveryAt).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Dòng địa chỉ riêng */}
                      <div className="flex items-start gap-1.5 text-xs font-semibold text-[var(--text-main)]">
                        <MapPin className="w-3.5 h-3.5 text-matcha-600 shrink-0 mt-0.5" />
                        <span>{order.shippingAddress}</span>
                      </div>

                      {/* Dòng ghi chú chung của đơn riêng (nếu có) */}
                      {order.note && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold italic">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{order.note}</span>
                        </div>
                      )}

                      {/* Dòng Tổng thanh toán */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-color)]">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                          Tổng thanh toán ({totalCups} cốc)
                        </span>
                        <span className="text-sm sm:text-base font-black text-matcha-600 dark:text-matcha-400">
                          {(order.finalAmount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* HÀNG 2: TÓM TẮT GOM THEO MÓN TRONG BILL KÈM ẢNH ĐẠI DIỆN */}
                    {groupedOrderItems.length > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] flex flex-wrap items-center gap-2.5 text-[11px]">
                        {groupedOrderItems.map((g, idx) => (
                          <span
                            key={g.key || idx}
                            className="inline-flex items-center gap-1.5 pr-1 py-0.5"
                          >
                            <img
                              src={getProductAvatar(g.productImage, g.productName)}
                              alt={g.productName}
                              className="w-6 h-6 rounded-md object-cover border border-[var(--border-color)] bg-white shrink-0"
                            />
                            <strong className="font-extrabold text-[var(--text-main)]">
                              {g.totalQty}x {g.productName}
                            </strong>
                            {idx < groupedOrderItems.length - 1 && (
                              <span className="text-[var(--text-muted)] ml-1">•</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* HÀNG 3: MÃ ĐƠN, TRẠNG THÁI, TIẾN ĐỘ PHA CHẾ & GIỜ TẠO */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--border-color)] text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)]">
                          #{order.orderCode}
                        </span>

                        {getStatusBadge(order.status)}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                            allPrepared
                              ? 'bg-matcha-500/15 text-matcha-700 dark:text-matcha-300 border-matcha-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Coffee className="w-2.5 h-2.5" />
                          <span>
                            Pha: {preparedCups}/{totalCups}
                          </span>
                        </span>

                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(order.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. COMPACT BOTTOM PAGINATION BAR */}
          <div className="nocha-card px-3.5 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] shrink-0">
            <div className="text-[var(--text-muted)] font-semibold">
              Hiển thị <strong className="text-[var(--text-main)]">{startIdx}</strong> –{' '}
              <strong className="text-[var(--text-main)]">{endIdx}</strong> /{' '}
              <strong className="text-matcha-600 dark:text-matcha-400">
                {pagination.totalItems}
              </strong>{' '}
              đơn
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold flex items-center gap-1 disabled:opacity-40 hover:opacity-80"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Trước</span>
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-matcha-500/15 text-matcha-700 dark:text-matcha-300 font-bold">
                {pagination.page} / {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold flex items-center gap-1 disabled:opacity-40 hover:opacity-80"
              >
                <span>Sau</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
