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
  SlidersHorizontal,
  Save,
  ShoppingBag,
  X,
  ChevronDown,
  ChevronUp,
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

  // Collapsible Action Panel state — MẶC ĐỊNH COLLAPSED (false) theo yêu cầu
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const [activePrepTab, setActivePrepTab] = useState<'DETAIL' | 'GROUPED'>('DETAIL');
  const [expectedTimeInput, setExpectedTimeInput] = useState<string>('');

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

  const syncFormWithOrder = useCallback((ord: any) => {
    setEditCustomerName(ord.customerName || '');
    setEditCustomerPhone(ord.customerPhone || '');
    setEditShippingAddress(ord.shippingAddress || '');
    setEditCreatedAt(
      ord.createdAt
        ? toLocalDateTimeInput(new Date(ord.createdAt))
        : toLocalDateTimeInput(new Date())
    );
    const expStr = ord.expectedDeliveryAt
      ? toLocalDateTimeInput(new Date(ord.expectedDeliveryAt))
      : toLocalDateTimeInput(new Date(Date.now() + 20 * 60 * 1000));
    setEditExpectedDelivery(expStr);
    setExpectedTimeInput(expStr);
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
              setIsActionPanelOpen(true);
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

  // Auto-refresh every 20s when in read-only mode
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

  // Quick Status Action (Confirm, Cancel, Ship, Complete) for Staff & Admin
  const handleQuickStatus = async (newStatus: string, label: string) => {
    if (!order) return;
    if (newStatus === 'CANCELLED' && !confirm(`Xác nhận HỦY / HOÀN đơn hàng #${order.orderCode}?`)) {
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

  // Save Expected Delivery Time
  const handleSaveExpectedTime = async (customIso?: string) => {
    if (!order) return;
    const isoToSave =
      customIso || (expectedTimeInput ? new Date(expectedTimeInput).toISOString() : null);
    if (!isoToSave) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_EXPECTED_TIME',
          expectedDeliveryAt: isoToSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể cập nhật giờ nhận dự kiến');
      setOrder(json.order);
      syncFormWithOrder(json.order);
      setToast({
        message: `Đã lưu giờ hẹn giao cho đơn #${order.orderCode}!`,
        type: 'success',
      });
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi cập nhật giờ hẹn', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Update Prep (By Individual Item or Mark All)
  const handleUpdatePrep = async (
    itemId: string | null,
    newPreparedQty: number,
    markAll = false
  ) => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
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
        setOrder(json.order);
        syncFormWithOrder(json.order);
      } else {
        setToast({ message: json.error || 'Lỗi cập nhật pha chế', type: 'error' });
      }
    } catch {
      setToast({ message: 'Lỗi kết nối khi cập nhật pha chế', type: 'error' });
    }
  };

  // Update Prep (Grouped by Product)
  const handleUpdateGroupPrep = async (
    groupItemIds: string[],
    groupAction: 'INCREMENT' | 'DECREMENT' | 'MARK_DONE' | 'RESET'
  ) => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PREP',
          groupItemIds,
          groupAction,
        }),
      });
      const json = await res.json();
      if (res.ok && json.order) {
        setOrder(json.order);
        syncFormWithOrder(json.order);
      } else {
        setToast({ message: json.error || 'Lỗi cập nhật pha chế theo món', type: 'error' });
      }
    } catch {
      setToast({ message: 'Lỗi kết nối khi cập nhật pha chế', type: 'error' });
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
          label: 'Chờ xác nhận',
          desc: 'Nhân viên NOCHA sẽ gọi điện xác nhận đơn trong ít phút',
          color: 'bg-purple-600 text-white',
          icon: Clock,
          step: 1,
        };
      case 'CREATED':
        return {
          label: 'Đã xác nhận đơn',
          desc: 'Đơn hàng đã được NOCHA xác nhận và đang chuẩn bị',
          color: 'bg-amber-400 text-slate-950',
          icon: CheckCircle2,
          step: 2,
        };
      case 'SHIPPING':
        return {
          label: 'Đang giao hàng',
          desc: 'Đồ uống đã pha xong và đang trên đường giao tới địa chỉ nhận',
          color: 'bg-sky-500 text-white',
          icon: Truck,
          step: 3,
        };
      case 'COMPLETED':
        return {
          label: 'Hoàn thành',
          desc: 'Đơn hàng đã giao thành công. Cảm ơn bạn đã ủng hộ NOCHA!',
          color: 'bg-emerald-500 text-white',
          icon: CheckCircle2,
          step: 4,
        };
      case 'CANCELLED':
        return {
          label: 'Đã hủy',
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
  const allPrepared = totalCups > 0 && preparedCups >= totalCups;

  const isSystemUser = Boolean(currentUser) || isAdmin;

  // Group items by product for both Bill Summary and Action Panel
  const groupedProducts = React.useMemo(() => {
    const groupedMap = new Map<
      string,
      {
        key: string;
        productName: string;
        productImage: string | null;
        unitPrice: number;
        totalQty: number;
        preparedQty: number;
        totalItemDiscount: number;
        totalLineAmount: number;
        itemIds: string[];
        subItems: any[];
      }
    >();

    for (const it of order?.items || []) {
      const groupKey = it.productId || (it.productName || 'Sản phẩm').trim().toLowerCase();
      const existing = groupedMap.get(groupKey);
      if (existing) {
        existing.totalQty += Number(it.quantity) || 0;
        existing.preparedQty += Number(it.preparedQty) || 0;
        existing.totalItemDiscount += Number(it.itemDiscount) || 0;
        existing.totalLineAmount += Number(it.lineTotal) || 0;
        if (it.id) existing.itemIds.push(it.id);
        existing.subItems.push(it);
      } else {
        groupedMap.set(groupKey, {
          key: groupKey,
          productName: it.productName || 'Sản phẩm',
          productImage: it.productImage || null,
          unitPrice: Number(it.unitPrice) || 0,
          totalQty: Number(it.quantity) || 0,
          preparedQty: Number(it.preparedQty) || 0,
          totalItemDiscount: Number(it.itemDiscount) || 0,
          totalLineAmount: Number(it.lineTotal) || 0,
          itemIds: it.id ? [it.id] : [],
          subItems: [it],
        });
      }
    }

    return Array.from(groupedMap.values());
  }, [order?.items]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-full">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Storefront / Detail Header (Compact) */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-main)] border-b border-[var(--border-color)] h-14 px-3 sm:px-6 flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {!loading &&
            (isSystemUser ? (
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold shadow-sm transition shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Danh sách đơn</span>
              </Link>
            ) : (
              <Link
                href="/order"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg nocha-card text-[11px] font-bold hover:opacity-80 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-matcha-600" />
                <span>Đặt thêm món</span>
              </Link>
            ))}

          <Link href={isSystemUser ? '/orders' : '/'} className="flex items-center gap-2 min-w-0">
            <img
              src="/images/logo.png"
              alt="Matcha NOCHA Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-xs sm:text-sm tracking-wider text-matcha-700 dark:text-matcha-400 leading-none block truncate">
                NOCHA BILL
              </span>
              <span className="text-[10px] font-medium text-[var(--text-muted)] block truncate">
                Chi tiết đơn hàng
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => loadOrderData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            title="Làm mới trạng thái"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <ThemeToggleButton />

          {!isSystemUser && (
            <a
              href="tel:0989600992"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold shadow-sm"
            >
              <PhoneCall className="w-3 h-3" />
              <span className="hidden sm:inline">0989600992</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-3.5">
        {loading ? (
          <div className="nocha-card p-10 text-center text-xs text-[var(--text-muted)]">
            Đang tải thông tin đơn hàng...
          </div>
        ) : error || !order ? (
          <div className="nocha-card p-8 text-center space-y-3">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div className="text-sm font-black">{error || 'Không tìm thấy đơn hàng'}</div>
            <Link
              href={isSystemUser ? '/orders' : '/order'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-bold"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isSystemUser ? 'Quay lại danh sách đơn' : 'Quay lại đặt thêm món'}</span>
            </Link>
          </div>
        ) : (
          <>
            {/* ============================================================= */}
            {/* COLLAPSIBLE ACTION PANEL (CHỈ HIỆN CHO NHÂN VIÊN / ADMIN)      */}
            {/* MẶC ĐỊNH COLLAPSED — BẤM VÀO MỚI EXPAND BỘ ACTION             */}
            {/* ============================================================= */}
            {isSystemUser && (
              <div className="nocha-card overflow-hidden border border-matcha-500/40">
                {/* Header Panel (Luôn hiển thị gọn 1 dòng) */}
                <button
                  type="button"
                  onClick={() => setIsActionPanelOpen((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 bg-[var(--bg-subtle)] hover:opacity-95 transition text-left"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-matcha-600 text-white text-[11px] font-bold">
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Bảng Thao Tác &amp; Pha Chế</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                        allPrepared
                          ? 'bg-matcha-500/15 text-matcha-700 dark:text-matcha-300 border-matcha-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <Coffee className="w-2.5 h-2.5" />
                      <span>
                        Pha chế: {preparedCups}/{totalCups} cốc
                      </span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold text-matcha-700 dark:text-matcha-300 shrink-0">
                    <span>{isActionPanelOpen ? 'Thu gọn' : 'Mở thao tác'}</span>
                    {isActionPanelOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>

                {/* Nội dung Panel (Chỉ hiển thị khi người dùng bấm Expand) */}
                {isActionPanelOpen && (
                  <div className="p-3.5 sm:p-4 border-t border-[var(--border-color)] space-y-3.5 text-xs">
                    {/* 1. Nhóm nút chuyển trạng thái & thao tác đơn (Nút nhỏ gọn) */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="px-2.5 py-1.5 rounded-lg bg-matcha-500/15 hover:bg-matcha-500/25 text-matcha-700 dark:text-matcha-300 border border-matcha-500/30 font-bold text-[11px] inline-flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Gọi khách ({order.customerPhone})</span>
                        </a>

                        {order.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickStatus('CREATED', 'Đã xác nhận / Nhận đơn')}
                            className="px-3 py-1.5 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Nhận đơn</span>
                          </button>
                        )}

                        {order.status === 'CREATED' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickStatus('SHIPPING', 'Đi đơn (Đang giao)')}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Đi đơn</span>
                          </button>
                        )}

                        {order.status === 'SHIPPING' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              handleQuickStatus('COMPLETED', 'Đã nhận tiền (Hoàn thành)')
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã nhận tiền</span>
                          </button>
                        )}

                        {order.status !== 'CANCELLED' &&
                          (isAdmin ||
                            order.status === 'PENDING' ||
                            order.status === 'SHIPPING') && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleQuickStatus('CANCELLED', 'Đã hủy / Hoàn đơn')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>{order.status === 'SHIPPING' ? 'Hoàn đơn' : 'Hủy đơn'}</span>
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)] text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3 text-matcha-600" />
                          <span>{copied ? 'Đã copy link' : 'Copy link đơn'}</span>
                        </button>
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isEditing) syncFormWithOrder(order);
                              setIsEditing(!isEditing);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition ${
                              isEditing
                                ? 'bg-slate-700 text-white'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isEditing ? (
                              <>
                                <X className="w-3 h-3" />
                                <span>Đóng sửa đơn</span>
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa đơn &amp; món</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleAdminDeleteOrder}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa đơn</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 2. Chỉnh nhanh giờ nhận đồ dự kiến */}
                    <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[var(--text-main)] inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-matcha-600" />
                          <span>Hẹn giờ giao:</span>
                        </span>
                        {[
                          { label: '+15p', mins: 15 },
                          { label: '+30p', mins: 30 },
                          { label: '+45p', mins: 45 },
                          { label: '+1h', mins: 60 },
                        ].map((q) => (
                          <button
                            key={q.mins}
                            type="button"
                            onClick={() => {
                              const dt = new Date(Date.now() + q.mins * 60 * 1000);
                              setExpectedTimeInput(toLocalDateTimeInput(dt));
                            }}
                            className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] hover:bg-matcha-500/15 font-bold text-[10px] border border-[var(--border-color)]"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="datetime-local"
                          value={expectedTimeInput}
                          onChange={(e) => setExpectedTimeInput(e.target.value)}
                          className="px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSaveExpectedTime()}
                          className="px-2.5 py-1 rounded-lg matcha-gradient-btn text-white font-bold text-[11px]"
                        >
                          Lưu giờ hẹn
                        </button>
                      </div>
                    </div>

                    {/* 3. Đánh dấu tiến độ pha chế (2 Tab: Chi tiết theo lượt đặt & Gom theo món) */}
                    <div className="space-y-2.5 pt-1 border-t border-[var(--border-color)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-[var(--text-muted)]">
                            Tiến độ pha chế ({preparedCups}/{totalCups} cốc):
                          </span>

                          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                            <button
                              type="button"
                              onClick={() => setActivePrepTab('DETAIL')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                                activePrepTab === 'DETAIL'
                                  ? 'matcha-gradient-btn text-white'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              📋 Theo lượt đặt ({(order.items || []).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePrepTab('GROUPED')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                                activePrepTab === 'GROUPED'
                                  ? 'matcha-gradient-btn text-white'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              🍵 Gom theo món ({groupedProducts.length})
                            </button>
                          </div>
                        </div>

                        {!allPrepared && (
                          <button
                            type="button"
                            onClick={() => handleUpdatePrep(null, 0, true)}
                            className="px-2.5 py-1 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold"
                          >
                            ✓ Pha xong cả đơn
                          </button>
                        )}
                      </div>

                      {activePrepTab === 'DETAIL' ? (
                        <div className="space-y-1.5">
                          {(order.items || []).map((item: any, idx: number) => {
                            const isItemDone = (item.preparedQty || 0) >= item.quantity;
                            return (
                              <div
                                key={item.id || idx}
                                className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
                                  isItemDone
                                    ? 'bg-matcha-500/10 border-matcha-500/30'
                                    : 'bg-[var(--bg-subtle)] border-[#e5e5e5] dark:border-[#838383]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getProductAvatar(item.productImage, item.productName)}
                                    alt={item.productName || 'Sản phẩm'}
                                    className="w-8 h-8 rounded-lg object-cover border border-[#e5e5e5] dark:border-[#838383] bg-white shrink-0"
                                  />
                                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-xs text-[var(--text-main)]">
                                      {idx + 1}. {item.productName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-matcha-600 text-white font-bold text-[10px]">
                                      x{item.quantity}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      ({item.selectedSize || 'M'} • Đ:{item.selectedSugar || '100%'} •{' '}
                                      {item.selectedIce || '100% đá'})
                                    </span>
                                    {item.note && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                        📝 {item.note}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                                  <span className="text-[11px] font-bold mr-1">
                                    <strong
                                      className={
                                        isItemDone
                                          ? 'text-matcha-600 dark:text-matcha-400'
                                          : 'text-amber-500'
                                      }
                                    >
                                      {item.preparedQty || 0}/{item.quantity}
                                    </strong>{' '}
                                    cốc
                                  </span>

                                  <button
                                    type="button"
                                    disabled={(item.preparedQty || 0) <= 0}
                                    onClick={() =>
                                      handleUpdatePrep(
                                        item.id,
                                        Math.max(0, (item.preparedQty || 0) - 1)
                                      )
                                    }
                                    className="w-6 h-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center disabled:opacity-40"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isItemDone}
                                    onClick={() =>
                                      handleUpdatePrep(
                                        item.id,
                                        Math.min(item.quantity, (item.preparedQty || 0) + 1)
                                      )
                                    }
                                    className="px-2 h-6 rounded-lg matcha-gradient-btn text-white text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-40"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>1</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdatePrep(item.id, isItemDone ? 0 : item.quantity)
                                    }
                                    className={`px-2 h-6 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                      isItemDone
                                        ? 'bg-emerald-400 text-slate-950'
                                        : 'bg-[var(--bg-card)] border border-matcha-500 text-matcha-700 dark:text-matcha-300'
                                    }`}
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{isItemDone ? 'Đã đủ' : 'Xong đủ'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {groupedProducts.map((group) => {
                            const isGroupDone = group.preparedQty >= group.totalQty;
                            const remainingCups = Math.max(0, group.totalQty - group.preparedQty);

                            return (
                              <div
                                key={group.key}
                                className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
                                  isGroupDone
                                    ? 'bg-matcha-500/10 border-matcha-500/30'
                                    : 'bg-[var(--bg-subtle)] border-[#e5e5e5] dark:border-[#838383]'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <img
                                    src={getProductAvatar(group.productImage, group.productName)}
                                    alt={group.productName || 'Sản phẩm'}
                                    className="w-9 h-9 rounded-lg object-cover border border-[#e5e5e5] dark:border-[#838383] bg-white shrink-0 mt-0.5"
                                  />
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-bold text-xs text-[var(--text-main)]">
                                        {group.productName}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-matcha-600 text-white font-bold text-[10px]">
                                        Tổng: {group.totalQty} cốc
                                      </span>
                                      {!isGroupDone && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                          Thiếu {remainingCups} cốc
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1">
                                      {group.subItems.map((sub: any, sIdx: number) => (
                                        <span
                                          key={sub.id || sIdx}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px]"
                                        >
                                          <strong>{sub.quantity} cốc</strong>
                                          <span className="text-[var(--text-muted)]">
                                            ({sub.selectedSize || 'M'} • Đ:{sub.selectedSugar || '100%'} •{' '}
                                            {sub.selectedIce || '100% đá'})
                                          </span>
                                          {sub.note && (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                                              [{sub.note}]
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                                  <span className="text-[11px] font-bold mr-1">
                                    <strong
                                      className={
                                        isGroupDone
                                          ? 'text-matcha-600 dark:text-matcha-400'
                                          : 'text-amber-500'
                                      }
                                    >
                                      {group.preparedQty}/{group.totalQty}
                                    </strong>{' '}
                                    cốc
                                  </span>

                                  <button
                                    type="button"
                                    disabled={group.preparedQty <= 0}
                                    onClick={() =>
                                      handleUpdateGroupPrep(group.itemIds, 'DECREMENT')
                                    }
                                    className="w-6 h-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center disabled:opacity-40"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isGroupDone}
                                    onClick={() =>
                                      handleUpdateGroupPrep(group.itemIds, 'INCREMENT')
                                    }
                                    className="px-2 h-6 rounded-lg matcha-gradient-btn text-white text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-40"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>1</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateGroupPrep(
                                        group.itemIds,
                                        isGroupDone ? 'RESET' : 'MARK_DONE'
                                      )
                                    }
                                    className={`px-2 h-6 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                      isGroupDone
                                        ? 'bg-emerald-400 text-slate-950'
                                        : 'bg-[var(--bg-card)] border border-matcha-500 text-matcha-700 dark:text-matcha-300'
                                    }`}
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{isGroupDone ? 'Đã đủ' : 'Xong đủ'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE A: ADMIN FULL ORDER & ITEM EDITOR FORM                   */}
            {/* ============================================================= */}
            {isAdmin && isEditing ? (
              <form
                onSubmit={handleSaveAdminEdit}
                className="nocha-card p-4 sm:p-5 space-y-5 border-2 border-amber-500"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                  <h2 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-500" />
                    <span>Chỉnh Sửa Đơn Hàng #{order.orderCode}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-[11px] font-bold"
                  >
                    Đóng
                  </button>
                </div>

                {/* 1. Customer & Order Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Tên Người Nhận *</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Số Điện Thoại *</label>
                    <input
                      type="tel"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1 text-[11px]">Địa Chỉ Giao Hàng *</label>
                    <input
                      type="text"
                      value={editShippingAddress}
                      onChange={(e) => setEditShippingAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[11px] text-amber-600 dark:text-amber-400">
                      📅 Ngày &amp; Giờ Tạo Đơn (Nhập bù)
                    </label>
                    <input
                      type="datetime-local"
                      value={editCreatedAt}
                      onChange={(e) => setEditCreatedAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-amber-500/50 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Giờ Nhận Dự Kiến</label>
                    <input
                      type="datetime-local"
                      value={editExpectedDelivery}
                      onChange={(e) => setEditExpectedDelivery(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Trạng Thái Đơn Hàng</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    >
                      <option value="PENDING">PENDING — Chờ xác nhận</option>
                      <option value="CREATED">CREATED — Đã tạo đơn (Chờ đi)</option>
                      <option value="SHIPPING">SHIPPING — Đang vận chuyển</option>
                      <option value="COMPLETED">COMPLETED — Hoàn thành</option>
                      <option value="CANCELLED">CANCELLED — Đã hủy</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1 text-[11px]">Ghi Chú Chung Cả Đơn</label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Ghi chú giao hàng..."
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>
                </div>

                {/* 2. Editable Order Items */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-black">
                      Danh Sách Món ({editItems.reduce((s, i) => s + Number(i.quantity), 0)} cốc)
                    </h3>

                    {menuProducts.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedNewProductId}
                          onChange={(e) => setSelectedNewProductId(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[11px] font-bold"
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
                          className="px-2.5 py-1 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm món</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {editItems.map((it) => {
                      const lineTotal = Math.max(
                        0,
                        Number(it.unitPrice) * Number(it.quantity) - Number(it.itemDiscount)
                      );
                      return (
                        <div
                          key={it.tempKey}
                          className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <img
                              src={getProductAvatar(it.productImage, it.productName)}
                              alt={it.productName || 'Sản phẩm'}
                              className="w-8 h-8 rounded-lg object-cover border border-[#e5e5e5] dark:border-[#838383] bg-white shrink-0"
                            />
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) =>
                                updateEditItem(it.tempKey, { productName: e.target.value })
                              }
                              className="font-bold text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => removeEditItem(it.tempKey)}
                              className="p-1 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 shrink-0"
                              title="Xóa dòng món này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
                                Số lượng
                              </label>
                              <div className="flex items-center bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEditItem(it.tempKey, {
                                      quantity: Math.max(1, Number(it.quantity) - 1),
                                    })
                                  }
                                  className="px-2 py-1 font-bold"
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
                                  className="px-2 py-1 font-bold"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
                                Size cốc
                              </label>
                              <input
                                type="text"
                                value={it.selectedSize}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedSize: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
                                % Đường
                              </label>
                              <select
                                value={it.selectedSugar}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedSugar: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {['0%', '30%', '50%', '70%', '100%'].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
                                % Đá
                              </label>
                              <select
                                value={it.selectedIce}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { selectedIce: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
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

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
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
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
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
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-amber-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-0.5">
                                Ghi chú món
                              </label>
                              <input
                                type="text"
                                value={it.note}
                                onChange={(e) =>
                                  updateEditItem(it.tempKey, { note: e.target.value })
                                }
                                placeholder="Ghi chú..."
                                className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Thành tiền dòng:
                            </span>
                            <span className="font-bold text-matcha-600 dark:text-matcha-400">
                              {lineTotal.toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Order Discount & Shipping Fee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-color)] text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-[11px]">
                      Chiết Khấu Cả Đơn (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={editOrderDiscount}
                      onChange={(e) =>
                        setEditOrderDiscount(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Hình Thức Giao Ship</label>
                    <select
                      value={editIsFreeShip ? 'FREE' : 'FEE'}
                      onChange={(e) => setEditIsFreeShip(e.target.value === 'FREE')}
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    >
                      <option value="FREE">Miễn phí ship (0đ)</option>
                      <option value="FEE">Có tính phí ship</option>
                    </select>
                  </div>

                  {!editIsFreeShip && (
                    <div>
                      <label className="block font-bold mb-1 text-[11px]">Phí Ship (VNĐ)</label>
                      <input
                        type="number"
                        value={editShippingFee}
                        onChange={(e) =>
                          setEditShippingFee(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Tạm tính: <strong>{editSubtotal.toLocaleString('vi-VN')}đ</strong> • Thuần:{' '}
                      <strong>{editNetRevenue.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <div className="text-sm font-black text-matcha-600 dark:text-matcha-400">
                      Tổng thu sau sửa: {editFinalAmount.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg matcha-gradient-btn text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ============================================================= */
              /* MODE B: CLEAN BILL VIEW (THÔNG TIN KHÁCH HÀNG QUAN TRỌNG Ở TRÊN) */
              /* ============================================================= */
              <div className="nocha-card p-4 sm:p-6 space-y-4">
                {/* 1. KHỐI TRÊN CÙNG: THÔNG TIN KHÁCH HÀNG, SĐT & ĐỊA CHỈ (QUAN TRỌNG NHẤT) */}
                {(() => {
                  const st = getStatusDisplay(order.status);
                  const StatusIcon = st.icon;
                  return (
                    <div className="space-y-3 border-b border-[var(--border-color)] pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black text-[var(--text-main)]">
                              <User className="w-4 h-4 text-matcha-600 shrink-0" />
                              <span>{order.customerName}</span>
                            </span>

                            <a
                              href={`tel:${order.customerPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-matcha-500/15 hover:bg-matcha-500/25 text-matcha-700 dark:text-matcha-300 font-black text-xs sm:text-sm transition"
                            >
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{order.customerPhone}</span>
                            </a>
                          </div>

                          <div className="flex items-start gap-1.5 text-xs sm:text-sm font-bold text-[var(--text-main)] pt-0.5">
                            <MapPin className="w-4 h-4 text-matcha-600 shrink-0 mt-0.5" />
                            <span>{order.shippingAddress}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 shadow-sm ${st.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{st.label}</span>
                          </span>
                          <span className="font-mono font-bold text-xs text-[var(--text-muted)]">
                            #{order.orderCode}
                          </span>
                        </div>
                      </div>

                      {/* Ghi chú đơn & Thời gian đặt / Hẹn giao */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-matcha-600 shrink-0" />
                            <span>
                              Đặt lúc:{' '}
                              <strong className="text-[var(--text-main)]">
                                {new Date(order.createdAt).toLocaleString('vi-VN')}
                              </strong>
                            </span>
                          </div>
                          {order.expectedDeliveryAt && (
                            <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] pl-4">
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

                        <div className="flex items-start gap-1 text-[11px]">
                          <FileText className="w-3 h-3 text-matcha-600 shrink-0 mt-0.5" />
                          {order.note ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold italic">
                              Ghi chú: {order.note}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">
                              Không có ghi chú đơn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thanh tiến trình 4 bước nhỏ gọn */}
                      {order.status !== 'CANCELLED' && (
                        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                          {[
                            { step: 1, label: 'Chờ xác nhận' },
                            { step: 2, label: 'Đã xác nhận' },
                            { step: 3, label: 'Đang giao' },
                            { step: 4, label: 'Hoàn thành' },
                          ].map((s) => {
                            const active = st.step >= s.step;
                            return (
                              <div key={s.step} className="space-y-1">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    active
                                      ? 'bg-matcha-500'
                                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)]'
                                  }`}
                                />
                                <div
                                  className={`text-[10px] font-bold text-center ${
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

                {/* 2. DANH SÁCH ĐỒ UỐNG TRONG BILL (GOM THEO MÓN GỌN GÀNG) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      Danh Sách Đồ Uống ({groupedProducts.length} món • {totalCups} cốc)
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {groupedProducts.map((group, index) => (
                      <div
                        key={group.key || index}
                        className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getProductAvatar(group.productImage, group.productName)}
                            alt={group.productName || 'Sản phẩm'}
                            className="w-10 h-10 rounded-lg object-cover border border-[#e5e5e5] dark:border-[#838383] bg-white shrink-0"
                          />

                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
                              {group.totalQty}x {group.productName}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              Đơn giá: {(group.unitPrice || 0).toLocaleString('vi-VN')} đ/cốc
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="font-black text-xs sm:text-sm text-matcha-600 dark:text-matcha-400">
                            {(group.totalLineAmount || 0).toLocaleString('vi-VN')} đ
                          </div>
                          {group.totalItemDiscount > 0 && (
                            <div className="text-[10px] text-amber-600 font-bold">
                              -{(group.totalItemDiscount || 0).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. TỔNG KẾT THANH TOÁN */}
                <div className="pt-3 border-t border-[var(--border-color)] space-y-1.5 text-xs">
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
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)] text-sm sm:text-base font-black">
                    <span>Tổng thanh toán:</span>
                    <span className="text-base sm:text-lg text-matcha-600 dark:text-matcha-400">
                      {(order.finalAmount || 0).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>

                {/* 4. LINK XEM LẠI ĐƠN NHỎ GỌN Ở CUỐI BILL */}
                <div className="pt-3 border-t border-[#e5e5e5] dark:border-[#838383] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)] font-medium">
                    🔗 Link theo dõi đơn hàng:
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial max-w-full sm:max-w-sm">
                    <input
                      type="text"
                      readOnly
                      value={trackingUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-matcha-500/15 border border-[var(--border-color)] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 text-matcha-700 dark:text-matcha-300"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Đã copy</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
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
