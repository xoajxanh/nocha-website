'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Coffee,
  Copy,
  Check,
  PhoneCall,
  MapPin,
  User,
  Phone,
  FileText,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Save,
  ShoppingBag,
  X,
} from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeProvider';
import Toast from '@/components/Toast';

export default function PublicOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params?.id || '');

  const [order, setOrder] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Admin Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuProducts, setMenuProducts] = useState<any[]>([]);

  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editExpectedDelivery, setEditExpectedDelivery] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editOrderDiscount, setEditOrderDiscount] = useState<number>(0);
  const [editIsFreeShip, setEditIsFreeShip] = useState<boolean>(true);
  const [editShippingFee, setEditShippingFee] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [selectedNewProductId, setSelectedNewProductId] = useState<string>('');

  const toLocalDateTimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const syncFormWithOrder = useCallback((ord: any) => {
    setEditCustomerName(ord.customerName || '');
    setEditCustomerPhone(ord.customerPhone || '');
    setEditShippingAddress(ord.shippingAddress || '');
    setEditCreatedAt(
      ord.createdAt
        ? toLocalDateTimeInput(new Date(ord.createdAt))
        : toLocalDateTimeInput(new Date())
    );
    setEditExpectedDelivery(
      ord.expectedDeliveryAt
        ? toLocalDateTimeInput(new Date(ord.expectedDeliveryAt))
        : toLocalDateTimeInput(new Date(Date.now() + 20 * 60 * 1000))
    );
    setEditNote(ord.note || '');
    setEditOrderDiscount(Number(ord.orderDiscount) || 0);
    setEditIsFreeShip(Boolean(ord.isFreeShip));
    setEditShippingFee(Number(ord.shippingFee) || 0);
    setEditStatus(ord.status || 'PENDING');
    setEditItems(
      (ord.items || []).map((it: any, idx: number) => ({
        tempKey: it.id || `item_${idx}_${Date.now()}`,
        id: it.id,
        productId: it.productId,
        productName: it.productName || 'Sản phẩm',
        productImage: it.productImage || null,
        quantity: Math.max(1, Number(it.quantity) || 1),
        preparedQty: Math.max(0, Number(it.preparedQty) || 0),
        selectedSize: it.selectedSize || 'M (500ml)',
        sizeExtraPrice: Number(it.sizeExtraPrice) || 0,
        selectedSugar: it.selectedSugar || '100%',
        selectedIce: it.selectedIce || '100% đá',
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        itemDiscount: Math.max(0, Number(it.itemDiscount) || 0),
        note: it.note || '',
      }))
    );
  }, []);

  const loadOrderData = useCallback(
    async (silent = false) => {
      if (!orderId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await fetch(`/api/public/orders/${orderId}`, { cache: 'no-store' });
        const json = await res.json();
        if (json?.currentUser !== undefined) {
          setCurrentUser(json.currentUser || null);
        }
        if (json?.isAdmin !== undefined) {
          setIsAdmin(Boolean(json.isAdmin));
        }
        if (!res.ok || !json.order) {
          setError(json.error || 'Không tìm thấy đơn hàng này');
          setOrder(null);
        } else {
          setOrder(json.order);
          if (!isEditing) {
            syncFormWithOrder(json.order);
            if (
              Boolean(json.isAdmin) &&
              typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('edit') === '1'
            ) {
              setIsEditing(true);
            }
          }
          setError('');
        }
      } catch {
        setError('Lỗi kết nối khi tải thông tin đơn hàng');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, isEditing, syncFormWithOrder]
  );

  useEffect(() => {
    loadOrderData(false);
  }, [loadOrderData]);

  // Load menu products if Admin so Admin can add new items to the order
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/public/menu')
      .then((r) => r.json())
      .then((data) => {
        if (data?.categories) {
          const prods = data.categories.flatMap((c: any) => c.products || []);
          setMenuProducts(prods);
          if (prods.length > 0) setSelectedNewProductId(prods[0].id);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  // Auto-refresh every 20s when in read-only mode so customer sees live status updates
  useEffect(() => {
    if (isEditing || !order) return;
    const timer = setInterval(() => {
      loadOrderData(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [isEditing, order, loadOrderData]);

  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/order/${order?.id || orderId}`
      : `/order/${orderId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setToast({ message: 'Đã sao chép link đơn hàng!', type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  // Admin Quick Status Action (Confirm, Cancel, Ship, Complete)
  const handleAdminQuickStatus = async (newStatus: string, label: string) => {
    if (!order) return;
    if (newStatus === 'CANCELLED' && !confirm(`Xác nhận HỦY đơn hàng #${order.orderCode}?`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể cập nhật trạng thái');
      setOrder(json.order);
      syncFormWithOrder(json.order);
      setToast({ message: `Đã chuyển đơn sang: ${label}!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi cập nhật trạng thái', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Admin Delete Order
  const handleAdminDeleteOrder = async () => {
    if (!order) return;
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${order.orderCode}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Không thể xóa đơn hàng');
      }
      setToast({ message: `Đã xóa đơn #${order.orderCode}`, type: 'success' });
      setTimeout(() => {
        router.push('/orders');
      }, 600);
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi khi xóa đơn hàng', type: 'error' });
      setSaving(false);
    }
  };

  // Admin Edit Item helpers
  const updateEditItem = (tempKey: string, patch: Partial<any>) => {
    setEditItems((prev) =>
      prev.map((it) => (it.tempKey === tempKey ? { ...it, ...patch } : it))
    );
  };

  const removeEditItem = (tempKey: string) => {
    if (editItems.length <= 1) {
      setToast({ message: 'Đơn hàng phải có ít nhất 1 món!', type: 'error' });
      return;
    }
    setEditItems((prev) => prev.filter((it) => it.tempKey !== tempKey));
  };

  const handleAddProductToEditItems = () => {
    const found = menuProducts.find((p) => p.id === selectedNewProductId);
    if (!found) return;
    setEditItems((prev) => [
      ...prev,
      {
        tempKey: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId: found.id,
        productName: found.name,
        productImage: found.imageUrl || null,
        quantity: 1,
        preparedQty: 0,
        selectedSize: 'M (500ml)',
        sizeExtraPrice: 0,
        selectedSugar: '100%',
        selectedIce: '100% đá',
        unitPrice: Number(found.basePrice) || 30000,
        itemDiscount: 0,
        note: '',
      },
    ]);
  };

  // Computed totals during Admin Edit
  const editSubtotal = editItems.reduce((sum, it) => {
    const line = Math.max(0, Number(it.unitPrice) * Number(it.quantity) - Number(it.itemDiscount));
    return sum + line;
  }, 0);
  const editNetRevenue = Math.max(0, editSubtotal - (Number(editOrderDiscount) || 0));
  const editFinalAmount =
    editNetRevenue + (editIsFreeShip ? 0 : Math.max(0, Number(editShippingFee) || 0));

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (editItems.length === 0) {
      setToast({ message: 'Đơn hàng phải có ít nhất 1 món', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_EDIT_ORDER',
          customerName: editCustomerName,
          customerPhone: editCustomerPhone,
          shippingAddress: editShippingAddress,
          customCreatedAt: editCreatedAt ? new Date(editCreatedAt).toISOString() : undefined,
          expectedDeliveryAt: editExpectedDelivery
            ? new Date(editExpectedDelivery).toISOString()
            : null,
          note: editNote,
          orderDiscount: Number(editOrderDiscount) || 0,
          isFreeShip: editIsFreeShip,
          shippingFee: editIsFreeShip ? 0 : Number(editShippingFee) || 0,
          status: editStatus,
          items: editItems,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể lưu chỉnh sửa đơn hàng');
      }
      setOrder(json.order);
      syncFormWithOrder(json.order);
      setIsEditing(false);
      setToast({ message: 'Đã lưu toàn bộ chỉnh sửa đơn hàng thành công!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi khi lưu đơn hàng', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'CHỜ XÁC NHẬN',
          desc: 'Nhân viên NOCHA sẽ gọi điện xác nhận đơn với bạn trong ít phút',
          color: 'bg-purple-600 text-white',
          icon: Clock,
          step: 1,
        };
      case 'CREATED':
        return {
          label: 'ĐÃ XÁC NHẬN ĐƠN',
          desc: 'Đơn hàng của bạn đã được NOCHA xác nhận',
          color: 'bg-amber-400 text-slate-950',
          icon: CheckCircle2,
          step: 2,
        };
      case 'SHIPPING':
        return {
          label: 'ĐANG GIAO HÀNG',
          desc: 'Đồ uống đã pha xong và đang trên đường giao tới địa chỉ của bạn',
          color: 'bg-sky-500 text-white',
          icon: Truck,
          step: 3,
        };
      case 'COMPLETED':
        return {
          label: 'HOÀN THÀNH',
          desc: 'Đơn hàng đã giao thành công. Cảm ơn bạn đã ủng hộ NOCHA!',
          color: 'bg-emerald-500 text-white',
          icon: CheckCircle2,
          step: 4,
        };
      case 'CANCELLED':
        return {
          label: 'ĐÃ HỦY',
          desc: 'Đơn hàng này đã bị hủy hoặc hoàn đơn',
          color: 'bg-rose-600 text-white',
          icon: XCircle,
          step: 0,
        };
      default:
        return {
          label: status,
          desc: '',
          color: 'bg-slate-500 text-white',
          icon: Clock,
          step: 1,
        };
    }
  };

  const totalCups = (order?.items || []).reduce(
    (s: number, it: any) => s + (Number(it.quantity) || 0),
    0
  );
  const preparedCups = (order?.items || []).reduce(
    (s: number, it: any) => s + (Number(it.preparedQty) || 0),
    0
  );

  const isSystemUser = Boolean(currentUser) || isAdmin;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-full">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Storefront Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-main)]/90 border-b border-[var(--border-color)] h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!loading &&
            (isSystemUser ? (
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Quản trị đơn</span>
              </Link>
            ) : (
              <Link
                href="/order"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl nocha-card text-xs font-bold hover:opacity-80 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-matcha-600" />
                <span className="hidden sm:inline">Quay lại đặt thêm món</span>
                <span className="sm:hidden">Đặt thêm món</span>
              </Link>
            ))}

          <Link href={isSystemUser ? '/orders' : '/'} className="flex items-center gap-2 min-w-0">
            <img
              src="/images/logo.png"
              alt="Matcha NOCHA Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-contain shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-lg tracking-wider text-matcha-700 dark:text-matcha-400 leading-none block truncate">
                NOCHA ORDER
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] block truncate">
                Chi Tiết &amp; Trạng Thái Đơn Hàng
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <ThemeToggleButton />

          {!isSystemUser && (
            <a
              href="tel:0989600992"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl matcha-gradient-btn text-white text-xs font-black shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">0989600992</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
        {loading ? (
          <div className="nocha-card p-12 text-center text-sm text-[var(--text-muted)]">
            Đang tải thông tin đơn hàng...
          </div>
        ) : error || !order ? (
          <div className="nocha-card p-10 text-center space-y-4">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div className="text-base font-black">{error || 'Không tìm thấy đơn hàng'}</div>
            <Link
              href={isSystemUser ? '/orders' : '/order'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl matcha-gradient-btn text-white text-xs font-bold"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isSystemUser ? 'Quay lại danh sách Quản trị đơn' : 'Quay lại đặt thêm món'}
              </span>
            </Link>
          </div>
        ) : (
          <>
            {/* ============================================================= */}
            {/* SHAREABLE LINK BAR (Ô TEXT LINK + NÚT COPY)                   */}
            {/* ============================================================= */}
            <div className="nocha-card p-4 sm:p-5 border-2 border-matcha-300 dark:border-matcha-700 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-matcha-800 dark:text-matcha-300">
                  🔗 Link xem lại đơn hàng #{order.orderCode} (Chỉ xem):
                </span>
                <button
                  type="button"
                  onClick={() => loadOrderData(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 text-xs font-bold text-matcha-600 dark:text-matcha-400 hover:underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Làm mới trạng thái</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-mono font-semibold text-[var(--text-main)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-black flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã Copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ============================================================= */}
            {/* ADMIN ACTION BAR (CHỈ HIỆN KHI ĐĂNG NHẬP TÀI KHOẢN ADMIN)     */}
            {/* ============================================================= */}
            {isAdmin && (
              <div className="nocha-card p-4 sm:p-5 border-2 border-amber-500/70 bg-amber-500/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      QUYỀN ADMIN
                    </span>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Quản trị, chỉnh sửa món, xác nhận, hủy hoặc xóa đơn hàng
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditing) syncFormWithOrder(order);
                        setIsEditing(!isEditing);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                        isEditing
                          ? 'bg-slate-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>Đóng Sửa Đơn</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa Đơn &amp; Sửa Món</span>
                        </>
                      )}
                    </button>

                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleAdminQuickStatus('CREATED', 'Xác Nhận / Nhận Đơn')}
                        className="px-3.5 py-1.5 rounded-xl matcha-gradient-btn text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác Nhận Đơn</span>
                      </button>
                    )}

                    {order.status === 'CREATED' && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleAdminQuickStatus('SHIPPING', 'Đi Đơn (Đang giao)')}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Đi Đơn</span>
                      </button>
                    )}

                    {order.status === 'SHIPPING' && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleAdminQuickStatus('COMPLETED', 'Đã Nhận Tiền (Hoàn thành)')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn Thành</span>
                      </button>
                    )}

                    {order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleAdminQuickStatus('CANCELLED', 'Đã Hủy Đơn')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Hủy Đơn</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleAdminDeleteOrder}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-black flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Đơn</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE A: ADMIN FULL ORDER & ITEM EDITOR FORM                   */}
            {/* ============================================================= */}
            {isAdmin && isEditing ? (
              <form
                onSubmit={handleSaveAdminEdit}
                className="nocha-card p-5 sm:p-6 space-y-6 border-2 border-amber-500"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-amber-500" />
                    <span>Chỉnh Sửa Đơn Hàng #{order.orderCode} (Admin)</span>
                  </h2>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    Sửa thông tin khách, trạng thái và từng dòng sản phẩm
                  </span>
                </div>

                {/* 1. Customer & Order Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Tên Người Nhận *</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Số Điện Thoại *</label>
                    <input
                      type="tel"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">Địa Chỉ Giao Hàng *</label>
                    <input
                      type="text"
                      value={editShippingAddress}
                      onChange={(e) => setEditShippingAddress(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-amber-600 dark:text-amber-400">
                      📅 Ngày &amp; Giờ Tạo Đơn (Nhập bù)
                    </label>
                    <input
                      type="datetime-local"
                      value={editCreatedAt}
                      onChange={(e) => setEditCreatedAt(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-amber-500/50 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Giờ Nhận Dự Kiến</label>
                    <input
                      type="datetime-local"
                      value={editExpectedDelivery}
                      onChange={(e) => setEditExpectedDelivery(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Trạng Thái Đơn Hàng</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    >
                      <option value="PENDING">PENDING — Chờ xác nhận</option>
                      <option value="CREATED">CREATED — Đã tạo đơn (Chờ đi)</option>
                      <option value="SHIPPING">SHIPPING — Đang vận chuyển</option>
                      <option value="COMPLETED">COMPLETED — Hoàn thành</option>
                      <option value="CANCELLED">CANCELLED — Đã hủy</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">Ghi Chú Chung Cả Đơn</label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Ghi chú giao hàng..."
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>
                </div>

                {/* 2. Editable Order Items */}
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black">
                      Danh Sách Món Trong Đơn ({editItems.reduce((s, i) => s + Number(i.quantity), 0)}{' '}
                      cốc)
                    </h3>

                    {menuProducts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedNewProductId}
                          onChange={(e) => setSelectedNewProductId(e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-bold"
                        >
                          {menuProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({Number(p.basePrice).toLocaleString('vi-VN')}đ)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddProductToEditItems}
                          className="px-3 py-1.5 rounded-xl matcha-gradient-btn text-white text-xs font-black flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Món</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {editItems.map((it) => {
                      const lineTotal = Math.max(
                        0,
                        Number(it.unitPrice) * Number(it.quantity) - Number(it.itemDiscount)
                      );
                      return (
                        <div
                          key={it.tempKey}
                          className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) =>
                                updateEditItem(it.tempKey, { productName: e.target.value })
                              }
                              className="font-black text-sm px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => removeEditItem(it.tempKey)}
                              className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 shrink-0"
                              title="Xóa dòng món này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Số lượng cốc
                              </label>
                              <div className="flex items-center bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEditItem(it.tempKey, {
                                      quantity: Math.max(1, Number(it.quantity) - 1),
                                    })
                                  }
                                  className="px-2.5 py-1.5 font-bold"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="flex-1 text-center font-black">{it.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEditItem(it.tempKey, {
                                      quantity: Number(it.quantity) + 1,
                                    })
                                  }
                                  className="px-2.5 py-1.5 font-bold"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Size cốc
                              </label>
                              <input
                                type="text"
                                value={it.selectedSize}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedSize: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                % Đường
                              </label>
                              <select
                                value={it.selectedSugar}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedSugar: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {['0%', '30%', '50%', '70%', '100%'].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                % Đá
                              </label>
                              <select
                                value={it.selectedIce}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedIce: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {[
                                  '0% (Không đá)',
                                  '30% đá',
                                  '50% đá',
                                  '70% đá',
                                  '100% đá',
                                  'Đá riêng',
                                ].map((ic) => (
                                  <option key={ic} value={ic}>
                                    {ic}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Đơn giá bán (VNĐ)
                              </label>
                              <input
                                type="number"
                                value={it.unitPrice}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, {
                                    unitPrice: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Chiết khấu món (VNĐ)
                              </label>
                              <input
                                type="number"
                                value={it.itemDiscount}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, {
                                    itemDiscount: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-amber-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Ghi chú riêng món này
                              </label>
                              <input
                                type="text"
                                value={it.note}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { note: e.target.value })
                                }
                                placeholder="Ghi chú món..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              Thành tiền dòng:
                            </span>
                            <span className="font-black text-matcha-600 dark:text-matcha-400">
                              {lineTotal.toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Order Discount & Shipping Fee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border-color)] text-xs">
                  <div>
                    <label className="block font-bold mb-1">Chiết Khấu Cả Đơn (VNĐ)</label>
                    <input
                      type="number"
                      value={editOrderDiscount}
                      onChange={(e) =>
                        setEditOrderDiscount(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Hình Thức Giao Ship</label>
                    <select
                      value={editIsFreeShip ? 'FREE' : 'FEE'}
                      onChange={(e) => setEditIsFreeShip(e.target.value === 'FREE')}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    >
                      <option value="FREE">Miễn phí ship (0đ)</option>
                      <option value="FEE">Có tính phí ship</option>
                    </select>
                  </div>

                  {!editIsFreeShip && (
                    <div>
                      <label className="block font-bold mb-1">Phí Ship (VNĐ)</label>
                      <input
                        type="number"
                        value={editShippingFee}
                        onChange={(e) =>
                          setEditShippingFee(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <div>
                      Tạm tính món: <strong>{editSubtotal.toLocaleString('vi-VN')}đ</strong> • Doanh
                      thu thuần: <strong>{editNetRevenue.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <div className="text-base font-black text-matcha-600 dark:text-matcha-400">
                      Tổng thu khách sau sửa: {editFinalAmount.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl matcha-gradient-btn text-white text-xs font-black flex items-center gap-1.5 shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Đang lưu...' : 'Lưu Toàn Bộ Thay Đổi'}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ============================================================= */
              /* MODE B: READ-ONLY PUBLIC ORDER VIEW (KHÁCH XEM ĐƠN)           */
              /* ============================================================= */
              <div className="nocha-card p-5 sm:p-7 space-y-6">
                {(() => {
                  const st = getStatusDisplay(order.status);
                  const StatusIcon = st.icon;
                  return (
                    <div className="space-y-4 border-b border-[var(--border-color)] pb-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-[var(--text-muted)] block">
                            Mã đơn hàng
                          </span>
                          <h1 className="text-2xl sm:text-3xl font-mono font-black text-matcha-700 dark:text-matcha-400">
                            #{order.orderCode}
                          </h1>
                        </div>

                        <span
                          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black inline-flex items-center gap-2 shadow-sm ${st.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          <span>{st.label}</span>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[var(--text-muted)]">{st.desc}</p>

                      {/* 4-Step Visual Progress Bar (if not cancelled) */}
                      {order.status !== 'CANCELLED' && (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {[
                            { step: 1, label: 'Chờ xác nhận' },
                            { step: 2, label: 'Đã xác nhận' },
                            { step: 3, label: 'Đang giao' },
                            { step: 4, label: 'Hoàn thành' },
                          ].map((s) => {
                            const active = st.step >= s.step;
                            return (
                              <div key={s.step} className="space-y-1.5">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    active
                                      ? 'bg-matcha-500'
                                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)]'
                                  }`}
                                />
                                <div
                                  className={`text-[10px] sm:text-xs font-bold text-center ${
                                    active
                                      ? 'text-matcha-700 dark:text-matcha-300'
                                      : 'text-[var(--text-muted)]'
                                  }`}
                                >
                                  {s.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Customer & Delivery Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-matcha-600" /> Người nhận:
                    </div>
                    <div className="font-extrabold text-sm">{order.customerName}</div>
                    <div className="text-matcha-700 dark:text-matcha-300 font-bold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-matcha-600" /> Địa chỉ giao hàng:
                    </div>
                    <div className="font-bold text-sm leading-snug">{order.shippingAddress}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-matcha-600" /> Thời gian:
                    </div>
                    <div>
                      Đặt lúc:{' '}
                      <strong>{new Date(order.createdAt).toLocaleString('vi-VN')}</strong>
                    </div>
                    {order.expectedDeliveryAt && (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold">
                        Giờ nhận dự kiến:{' '}
                        {new Date(order.expectedDeliveryAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-matcha-600" /> Ghi chú đơn hàng:
                    </div>
                    {order.note ? (
                      <div className="text-amber-600 dark:text-amber-400 font-semibold italic">
                        {order.note}
                      </div>
                    ) : (
                      <div className="text-[var(--text-muted)] italic">Không có ghi chú</div>
                    )}
                  </div>
                </div>

                {/* Order Items List (Read-only) */}
                <div className="space-y-3">
                  <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)]">
                    Danh Sách Đồ Uống ({totalCups} cốc)
                  </h2>

                  <div className="space-y-2.5">
                    {(order.items || []).map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-matcha-500/15 text-matcha-600 flex items-center justify-center shrink-0">
                              <Coffee className="w-5 h-5" />
                            </div>
                          )}

                          <div className="space-y-1 min-w-0">
                            <div className="font-black text-sm text-[var(--text-main)]">
                              {item.quantity}x {item.productName}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-matcha-700 dark:text-matcha-300">
                              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]">
                                Size: {item.selectedSize || 'M'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]">
                                Đường: {item.selectedSugar || '100%'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]">
                                Đá: {item.selectedIce || '100%'}
                              </span>
                            </div>
                            {item.note && (
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                Ghi chú món: {item.note}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <div className="font-black text-sm text-matcha-600 dark:text-matcha-400">
                            {(item.lineTotal || 0).toLocaleString('vi-VN')} đ
                          </div>
                          {item.itemDiscount > 0 && (
                            <div className="text-[10px] text-amber-600 font-bold">
                              -{(item.itemDiscount || 0).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="pt-4 border-t border-[var(--border-color)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Tạm tính đồ uống:</span>
                    <span className="font-bold">
                      {(order.subtotalAmount || 0).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  {order.orderDiscount > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Chiết khấu đơn hàng:</span>
                      <span className="font-bold">
                        -{(order.orderDiscount || 0).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Phí giao hàng (Ship):</span>
                    <span className="font-bold">
                      {order.isFreeShip
                        ? 'Miễn phí (0đ)'
                        : `${(order.shippingFee || 0).toLocaleString('vi-VN')} VNĐ`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)] text-base font-black">
                    <span>Tổng thanh toán:</span>
                    <span className="text-xl text-matcha-600 dark:text-matcha-400">
                      {(order.finalAmount || 0).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
