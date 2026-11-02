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
  Check,
  Plus,
  Minus,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
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

  // State for editing expected delivery time on a specific order
  const [editingTimeOrderId, setEditingTimeOrderId] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState<string>('');

  const toLocalDateTimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Mặc định tất cả đơn hàng đều auto-collapsed (đóng gọn)
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

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

  const handleUpdatePrep = async (
    orderId: string,
    itemId: string | null,
    newPreparedQty: number,
    markAll = false
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PREP',
          itemId,
          preparedQty: newPreparedQty,
          markAll,
        }),
      });
      const json = await res.json();
      if (res.ok && json.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? json.order : o)));
      } else {
        setToast({ message: json.error || 'Lỗi cập nhật pha chế', type: 'error' });
      }
    } catch {
      setToast({ message: 'Lỗi kết nối khi cập nhật pha chế', type: 'error' });
    }
  };

  const handleTransitionStatus = async (
    order: any,
    newStatus: 'CREATED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED'
  ) => {
    const labelMap: Record<string, string> = {
      CREATED: 'NHẬN ĐƠN (Chuyển sang Đã tạo đơn)',
      SHIPPING: 'ĐI ĐƠN (Chuyển sang Đang vận chuyển)',
      COMPLETED: 'ĐÃ NHẬN TIỀN (Chuyển sang Hoàn thành)',
      CANCELLED: 'HOÀN / HỦY ĐƠN (Chuyển sang Đã hủy)',
    };

    if (newStatus === 'CANCELLED') {
      if (!confirm(`Xác nhận HỦY / HOÀN ĐƠN [${order.orderCode}]?`)) {
        return;
      }
    }

    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          newStatus,
          ...(editingTimeOrderId === order.id && editingTimeValue
            ? { expectedDeliveryAt: new Date(editingTimeValue).toISOString() }
            : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể chuyển trạng thái');
      }

      if (editingTimeOrderId === order.id) {
        setEditingTimeOrderId(null);
      }

      setToast({
        message: `Đơn ${order.orderCode}: Đã ${labelMap[newStatus]}!`,
        type: 'success',
      });

      fetchOrdersFromServer(statusFilter, appliedSearch, page);
    } catch (err: any) {
      setToast({ message: err.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openEditExpectedTime = (order: any) => {
    const initialDate = order.expectedDeliveryAt
      ? new Date(order.expectedDeliveryAt)
      : new Date(Date.now() + 20 * 60 * 1000);
    setEditingTimeOrderId(order.id);
    setEditingTimeValue(toLocalDateTimeInput(initialDate));
  };

  const handleSaveExpectedTime = async (orderId: string, orderCode: string, customIso?: string) => {
    const isoToSave =
      customIso || (editingTimeValue ? new Date(editingTimeValue).toISOString() : null);
    if (!isoToSave) return;

    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_EXPECTED_TIME',
          expectedDeliveryAt: isoToSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể cập nhật giờ nhận dự kiến');
      }
      setEditingTimeOrderId(null);
      setToast({
        message: `Đã cập nhật giờ nhận dự kiến cho đơn #${orderCode}!`,
        type: 'success',
      });
      fetchOrdersFromServer(statusFilter, appliedSearch, page);
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi cập nhật giờ hẹn', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderCode: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn đơn hàng [${orderCode}]?`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: `Đã xóa đơn ${orderCode}`, type: 'success' });
        fetchOrdersFromServer(statusFilter, appliedSearch, page);
      }
    } catch {
      setToast({ message: 'Không thể xóa đơn hàng', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-sm shadow-purple-500/30 ring-2 ring-purple-300/50 animate-pulse">
            <PhoneIncoming className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>CHỜ XÁC NHẬN (KHÁCH ĐẶT)</span>
          </span>
        );
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30 ring-2 ring-amber-300/50">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ĐÃ TẠO ĐƠN (CHỜ ĐI ĐƠN)</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-500 text-white shadow-sm shadow-sky-500/30 ring-2 ring-sky-300/40">
            <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ĐANG VẬN CHUYỂN</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-300/50">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>HOÀN THÀNH</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-2 ring-rose-400/40">
            <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ĐÃ HỦY (HOÀN ĐƠN)</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getCardAccentClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'border-l-[6px] border-l-purple-500';
      case 'CREATED':
        return 'border-l-[6px] border-l-amber-400';
      case 'SHIPPING':
        return 'border-l-[6px] border-l-sky-500';
      case 'COMPLETED':
        return 'border-l-[6px] border-l-emerald-400';
      case 'CANCELLED':
        return 'border-l-[6px] border-l-rose-600 opacity-85';
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

        <main className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden gap-4">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          {/* 1. FIXED HEADER TITLE (shrink-0) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-matcha-500 shrink-0" />
                <span>Quản Lý Đơn Hàng &amp; Pha Chế</span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Đơn khách đặt online ở trạng thái Chờ Xác Nhận: Gọi điện xác nhận với khách rồi bấm NHẬN ĐƠN
              </p>
            </div>

            <Link
              href="/orders/create"
              className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>TẠO ĐƠN MỚI</span>
            </Link>
          </div>

          {/* 2. FIXED FILTER TABS & SEARCH BAR (shrink-0) */}
          <div className="nocha-card p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {[
                { key: 'ALL', label: 'Tất Cả Đơn' },
                {
                  key: 'URGENT_1H',
                  label: '🔥 Đơn Cần Giao (1h tới)',
                  badge: urgentCount,
                  badgeColor: 'bg-rose-600 text-white animate-pulse',
                },
                {
                  key: 'PENDING',
                  label: 'Chờ Xác Nhận',
                  badge: pendingCount,
                  badgeColor: 'bg-purple-600 text-white animate-pulse',
                },
                { key: 'CREATED', label: 'Đã Tạo Đơn' },
                { key: 'SHIPPING', label: 'Đang Giao' },
                { key: 'COMPLETED', label: 'Hoàn Thành' },
                { key: 'CANCELLED', label: 'Đã Hủy' },
              ].map((tab: any) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusTabChange(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? 'matcha-gradient-btn text-white shadow-sm'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
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
              className="flex items-center gap-2 w-full lg:w-auto"
            >
              <div className="relative flex-1 lg:w-72">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tên người đặt hoặc địa chỉ giao..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-medium focus:outline-none focus:border-matcha-500"
                />
                {(searchInput || appliedSearch) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-bold shrink-0"
              >
                Tìm
              </button>
            </form>
          </div>

          {/* 3. SCROLLABLE ORDERS LIST AREA (flex-1 min-h-0 overflow-y-auto) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            {loading ? (
              <div className="nocha-card p-12 text-center text-xs text-[var(--text-muted)]">
                Đang tải danh sách đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="nocha-card p-12 text-center space-y-3">
                <Coffee className="w-10 h-10 text-matcha-500 mx-auto opacity-60" />
                <div className="text-sm font-bold">
                  Không tìm thấy đơn hàng nào khớp bộ lọc hiện tại
                </div>
                {(statusFilter !== 'ALL' || appliedSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      handleClearSearch();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-bold"
                  >
                    Xem lại tất cả đơn
                  </button>
                )}
              </div>
            ) : (
              orders.map((order) => {
                const isExpanded = Boolean(expandedOrders[order.id]);
                const totalCups = (order.items || []).reduce(
                  (s: number, it: any) => s + (it.quantity || 0),
                  0
                );
                const preparedCups = (order.items || []).reduce(
                  (s: number, it: any) => s + (it.preparedQty || 0),
                  0
                );
                const allPrepared = totalCups > 0 && preparedCups >= totalCups;

                return (
                  <div
                    key={order.id}
                    className={`nocha-card overflow-hidden transition ${getCardAccentClass(
                      order.status
                    )}`}
                  >
                    {/* COMPACT SUMMARY ROW */}
                    <div
                      onClick={() => toggleExpandOrder(order.id)}
                      className="p-3.5 sm:px-5 cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                            #{order.orderCode}
                          </span>

                          {getStatusBadge(order.status)}

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 border ${
                              allPrepared
                                ? 'bg-matcha-500/20 text-matcha-700 dark:text-matcha-300 border-matcha-500/40'
                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            }`}
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>
                              Pha chế: {preparedCups}/{totalCups} cốc
                            </span>
                          </span>

                          <span className="text-xs text-[var(--text-muted)] font-medium">
                            Tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </span>

                          {/* Giờ nhận đồ dự kiến + Nút chỉnh nhanh */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingTimeOrderId === order.id) {
                                setEditingTimeOrderId(null);
                              } else {
                                openEditExpectedTime(order);
                              }
                            }}
                            title="Bấm để đặt lại / đổi giờ nhận đồ dự kiến"
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition hover:scale-105 ${
                              order.expectedDeliveryAt &&
                              order.status !== 'COMPLETED' &&
                              order.status !== 'CANCELLED' &&
                              new Date(order.expectedDeliveryAt).getTime() <=
                                Date.now() + 60 * 60 * 1000
                                ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {order.expectedDeliveryAt
                                ? `Hẹn giao: ${new Date(
                                    order.expectedDeliveryAt
                                  ).toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}`
                                : '+ Đặt giờ nhận'}
                            </span>
                          </button>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Bước 0: Đơn khách vãng lai đặt (PENDING) -> Nút Gọi khách & NHẬN ĐƠN */}
                          {order.status === 'PENDING' && (
                            <>
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-extrabold text-xs flex items-center gap-1.5 transition"
                                title="Alo xác nhận đơn với khách"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Alo Khách</span>
                              </a>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleTransitionStatus(order, 'CREATED')}
                                className="px-4 py-1.5 rounded-xl matcha-gradient-btn text-white font-black text-xs shadow-md flex items-center gap-1.5 transition transform hover:scale-105"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>NHẬN ĐƠN</span>
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleTransitionStatus(order, 'CANCELLED')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm flex items-center gap-1 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>HỦY</span>
                              </button>
                            </>
                          )}

                          {/* Bước 1: Đã tạo đơn (CREATED) -> Nút ĐI ĐƠN */}
                          {order.status === 'CREATED' && (
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => handleTransitionStatus(order, 'SHIPPING')}
                              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>ĐI ĐƠN</span>
                            </button>
                          )}

                          {/* Bước 2: Đang vận chuyển (SHIPPING) -> Nút ĐÃ NHẬN TIỀN hoặc HOÀN ĐƠN */}
                          {order.status === 'SHIPPING' && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleTransitionStatus(order, 'COMPLETED')}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ĐÃ NHẬN TIỀN</span>
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => handleTransitionStatus(order, 'CANCELLED')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm flex items-center gap-1 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>HOÀN ĐƠN</span>
                              </button>
                            </>
                          )}

                          {user.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id, order.orderCode)}
                              className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 transition"
                              title="Xóa đơn hàng (Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpandOrder(order.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)] text-xs font-extrabold text-matcha-700 dark:text-matcha-300"
                          >
                            <span>
                              {isExpanded
                                ? 'Thu gọn'
                                : `Chi tiết (${order.items?.length || 0} dòng)`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-[var(--border-color)]/70 text-xs items-center">
                        <div className="lg:col-span-3 flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-matcha-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-black text-sm">{order.customerName}</span>
                            <span className="text-[var(--text-muted)] ml-1.5 font-semibold">
                              • {order.customerPhone}
                            </span>
                          </div>
                        </div>

                        <div className="lg:col-span-4 flex items-center gap-1.5 min-w-0 text-[var(--text-muted)]">
                          <MapPin className="w-3.5 h-3.5 text-matcha-500 shrink-0" />
                          <span className="font-semibold text-[var(--text-main)] truncate">
                            {order.shippingAddress}
                          </span>
                        </div>

                        <div className="lg:col-span-2 flex items-center gap-1.5 min-w-0">
                          {order.note ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold truncate flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              {order.note}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {order.createdBy?.displayName
                                ? `Phụ trách: ${order.createdBy.displayName}`
                                : 'Khách đặt trên Web (Chưa nhận)'}
                            </span>
                          )}
                        </div>

                        <div className="lg:col-span-3 sm:text-right font-black text-sm">
                          <span className="text-xs font-semibold text-[var(--text-muted)] mr-1">
                            Tổng thu:
                          </span>
                          <span className="text-base text-matcha-600 dark:text-matcha-400">
                            {(order.finalAmount || 0).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      </div>

                      {/* INLINE EXPECTED DELIVERY TIME EDITOR (Khi nhân viên bấm vào giờ hẹn để set lại) */}
                      {editingTimeOrderId === order.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 rounded-2xl bg-[var(--bg-subtle)] border-2 border-matcha-500 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-matcha-700 dark:text-matcha-300 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Giờ nhận dự kiến:
                            </span>
                            {[
                              { label: 'Giao ngay (+15p)', mins: 15 },
                              { label: '+30 phút', mins: 30 },
                              { label: '+45 phút', mins: 45 },
                              { label: '+1 tiếng', mins: 60 },
                            ].map((q) => (
                              <button
                                key={q.mins}
                                type="button"
                                onClick={() => {
                                  const dt = new Date(Date.now() + q.mins * 60 * 1000);
                                  setEditingTimeValue(toLocalDateTimeInput(dt));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-matcha-100 dark:hover:bg-matcha-900 font-bold text-[11px] border border-[var(--border-color)]"
                              >
                                {q.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="datetime-local"
                              value={editingTimeValue}
                              onChange={(e) => setEditingTimeValue(e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-xs"
                            />
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => handleSaveExpectedTime(order.id, order.orderCode)}
                              className="px-3.5 py-1.5 rounded-xl matcha-gradient-btn text-white font-black text-xs shadow-sm"
                            >
                              Lưu giờ hẹn
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTimeOrderId(null)}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-xs text-[var(--text-muted)]"
                            >
                              Đóng
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/40 p-4 sm:px-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                            Danh Sách Món &amp; Đánh Dấu Pha Chế ({preparedCups}/{totalCups} cốc):
                          </div>

                          {!allPrepared && (order.status === 'CREATED' || order.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => handleUpdatePrep(order.id, null, 0, true)}
                              className="px-3 py-1 rounded-xl matcha-gradient-btn text-white text-xs font-bold shadow-sm"
                            >
                              ✓ Đánh dấu pha xong cả đơn
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {(order.items || []).map((item: any, idx: number) => {
                            const isItemDone = (item.preparedQty || 0) >= item.quantity;
                            return (
                              <div
                                key={item.id || idx}
                                className={`p-3.5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                  isItemDone
                                    ? 'bg-matcha-500/15 border-matcha-500/40'
                                    : 'bg-[var(--bg-card)] border-[var(--border-color)]'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                      isItemDone
                                        ? 'bg-matcha-500 text-white shadow-sm'
                                        : 'bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)]'
                                    }`}
                                  >
                                    {isItemDone ? <Check className="w-4 h-4" /> : `${idx + 1}`}
                                  </span>

                                  <div className="space-y-1 text-xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-black text-sm sm:text-base">
                                        {item.productName}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-lg bg-matcha-600 text-white font-black text-xs">
                                        x{item.quantity} cốc
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                      {item.selectedSize && (
                                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                                          Size: {item.selectedSize}
                                        </span>
                                      )}
                                      {item.selectedSugar && (
                                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-color)] text-matcha-700 dark:text-matcha-300">
                                          Đường: {item.selectedSugar}
                                        </span>
                                      )}
                                      {item.selectedIce && (
                                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-color)] text-sky-600 dark:text-sky-300">
                                          Đá: {item.selectedIce}
                                        </span>
                                      )}
                                    </div>

                                    {item.note && (
                                      <div className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-block">
                                        📝 Ghi chú món: {item.note}
                                      </div>
                                    )}

                                    <div className="text-[11px] text-[var(--text-muted)]">
                                      Giá lúc bán:{' '}
                                      <strong>{(item.unitPrice || 0).toLocaleString('vi-VN')}đ</strong>
                                      {item.itemDiscount > 0 && (
                                        <span className="text-amber-600 ml-2">
                                          • Chiết khấu dòng: -
                                          {item.itemDiscount.toLocaleString('vi-VN')}đ
                                        </span>
                                      )}
                                      <span className="ml-2 font-bold text-[var(--text-main)]">
                                        • Thành tiền: {(item.lineTotal || 0).toLocaleString('vi-VN')}đ
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-color)]">
                                  <div className="text-xs font-bold mr-1">
                                    Đã chuẩn bị:{' '}
                                    <span
                                      className={`text-sm font-black ${
                                        isItemDone
                                          ? 'text-matcha-600 dark:text-matcha-400'
                                          : 'text-amber-500'
                                      }`}
                                    >
                                      {item.preparedQty || 0} / {item.quantity}
                                    </span>{' '}
                                    cốc
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={(item.preparedQty || 0) <= 0}
                                      onClick={() =>
                                        handleUpdatePrep(
                                          order.id,
                                          item.id,
                                          Math.max(0, (item.preparedQty || 0) - 1)
                                        )
                                      }
                                      className="w-8 h-8 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center font-bold hover:opacity-80 disabled:opacity-40"
                                      title="Giảm 1 cốc"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isItemDone}
                                      onClick={() =>
                                        handleUpdatePrep(
                                          order.id,
                                          item.id,
                                          Math.min(item.quantity, (item.preparedQty || 0) + 1)
                                        )
                                      }
                                      className="px-3 h-8 rounded-xl matcha-gradient-btn text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                                      title="Đánh dấu xong thêm 1 cốc"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+1 cốc</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdatePrep(
                                          order.id,
                                          item.id,
                                          isItemDone ? 0 : item.quantity
                                        )
                                      }
                                      className={`px-3 h-8 rounded-xl text-xs font-extrabold flex items-center gap-1 transition ${
                                        isItemDone
                                          ? 'bg-emerald-400 text-slate-950 shadow-sm'
                                          : 'bg-[var(--bg-subtle)] border border-matcha-500 text-matcha-700 dark:text-matcha-300'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{isItemDone ? 'Đã xong đủ' : 'Xong đủ'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-4">
                            <span>
                              Tạm tính món:{' '}
                              <strong>{(order.subtotalAmount || 0).toLocaleString('vi-VN')}đ</strong>
                            </span>
                            {order.orderDiscount > 0 && (
                              <span>
                                Chiết khấu đơn:{' '}
                                <strong className="text-amber-500">
                                  -{(order.orderDiscount || 0).toLocaleString('vi-VN')}đ
                                </strong>
                              </span>
                            )}
                            <span>
                              Doanh thu thuần (không ship):{' '}
                              <strong className="text-matcha-600 dark:text-matcha-400">
                                {(order.netRevenue || 0).toLocaleString('vi-VN')}đ
                              </strong>
                            </span>
                            <span>
                              Phí ship:{' '}
                              <strong>
                                {order.isFreeShip
                                  ? 'Freeship (0đ)'
                                  : `${(order.shippingFee || 0).toLocaleString('vi-VN')}đ`}
                              </strong>
                            </span>
                            <span>
                              Phụ trách:{' '}
                              <strong>
                                {order.createdBy?.displayName || 'Khách đặt Web (Chờ nhận)'}
                              </strong>
                            </span>
                          </div>

                          <a
                            href={`tel:${order.customerPhone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-matcha-500/15 text-matcha-700 dark:text-matcha-300 font-bold"
                          >
                            <Phone className="w-3.5 h-3.5" /> Gọi khách: {order.customerPhone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. FIXED BOTTOM PAGINATION BAR (shrink-0, 20 items / page) */}
          <div className="nocha-card px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shrink-0">
            <div className="text-[var(--text-muted)] font-semibold">
              Hiển thị <strong className="text-[var(--text-main)]">{startIdx}</strong> –{' '}
              <strong className="text-[var(--text-main)]">{endIdx}</strong> trên tổng số{' '}
              <strong className="text-matcha-600 dark:text-matcha-400">
                {pagination.totalItems}
              </strong>{' '}
              đơn hàng ({PAGE_LIMIT} đơn/trang)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold flex items-center gap-1 disabled:opacity-40 hover:opacity-80"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-matcha-500/15 text-matcha-700 dark:text-matcha-300 font-black">
                Trang {pagination.page} / {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold flex items-center gap-1 disabled:opacity-40 hover:opacity-80"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
