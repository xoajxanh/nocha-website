'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Leaf,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  PhoneCall,
  MapPin,
  User,
  Phone,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Coffee,
  Clock,
  Copy,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeProvider';
import Toast from '@/components/Toast';

interface GuestCartItem {
  tempId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  selectedSize: string;
  sizeExtraPrice: number;
  selectedSugar: string;
  selectedIce: string;
  unitPrice: number;
  note: string;
}

export default function GuestOrderPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Drink customization modal
  const [pickingProduct, setPickingProduct] = useState<any | null>(null);
  const [pickQty, setPickQty] = useState(1);
  const [pickSize, setPickSize] = useState<{ name: string; price: number }>({
    name: 'M (500ml)',
    price: 0,
  });
  const [pickSugar, setPickSugar] = useState('100%');
  const [pickIce, setPickIce] = useState('100% đá');
  const [pickNote, setPickNote] = useState('');

  // Guest Cart & Delivery Form
  const toLocalDateTimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [cart, setCart] = useState<GuestCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [expectedDeliveryInput, setExpectedDeliveryInput] = useState<string>(() =>
    toLocalDateTimeInput(new Date(Date.now() + 20 * 60 * 1000))
  );
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setQuickDeliveryMinutes = (minutesFromNow: number) => {
    setExpectedDeliveryInput(
      toLocalDateTimeInput(new Date(Date.now() + minutesFromNow * 60 * 1000))
    );
  };

  // Completed Order Receipt State
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const getOrderTrackingUrl = (orderId: string) => {
    if (typeof window === 'undefined') return `/order/${orderId}`;
    return `${window.location.origin}/order/${orderId}`;
  };

  const handleCopyOrderLink = (orderId: string) => {
    const url = getOrderTrackingUrl(orderId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setToast({ message: 'Đã sao chép link xem lại đơn hàng!', type: 'success' });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const parseJsonSafe = (str: string, fallback: any) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    fetch('/api/public/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);

          // Check if URL has ?product=<id> to auto-open customization modal
          const params = new URLSearchParams(window.location.search);
          const preselectId = params.get('product');
          if (preselectId) {
            for (const cat of data.categories) {
              const found = (cat.products || []).find((p: any) => p.id === preselectId);
              if (found) {
                openCustomizeModal(found);
                break;
              }
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCustomizeModal = (prod: any) => {
    const sizes = parseJsonSafe(prod.sizesJson, [{ name: 'M (500ml)', price: 0 }]);
    const sugars = parseJsonSafe(prod.sugarOptionsJson, ['0%', '30%', '50%', '70%', '100%']);
    const ices = parseJsonSafe(prod.iceOptionsJson, ['0%', '30%', '50%', '70%', '100%', 'Đá riêng']);

    const defaultSize =
      sizes.find((s: any) => s.name.includes('M') || Number(s.price) === 0) ||
      sizes[0] || { name: 'M (500ml)', price: 0 };
    const defaultSugar = sugars.includes('100%') ? '100%' : sugars[sugars.length - 1] || '100%';
    const defaultIce =
      ices.find((ic: string) => ic.includes('100%')) || ices[ices.length - 1] || '100%';

    setPickingProduct({ ...prod, sizes, sugars, ices });
    setPickQty(1);
    setPickSize(defaultSize);
    setPickSugar(defaultSugar);
    setPickIce(defaultIce);
    setPickNote('');
  };

  const currentModalUnitPrice = pickingProduct
    ? Math.max(0, (pickingProduct.basePrice || 0) + (Number(pickSize.price) || 0))
    : 0;

  const handleAddToCart = () => {
    if (!pickingProduct) return;

    const newItem: GuestCartItem = {
      tempId: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: pickingProduct.id,
      productName: pickingProduct.name,
      productImage: pickingProduct.imageUrl,
      quantity: Math.max(1, pickQty),
      selectedSize: pickSize.name,
      sizeExtraPrice: Number(pickSize.price) || 0,
      selectedSugar: pickSugar,
      selectedIce: pickIce,
      unitPrice: currentModalUnitPrice,
      note: pickNote.trim(),
    };

    setCart((prev) => [...prev, newItem]);
    setPickingProduct(null);
    setToast({
      message: `Đã thêm ${newItem.quantity}x ${newItem.productName} vào giỏ!`,
      type: 'success',
    });
  };

  const updateCartQty = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev.map((it) =>
        it.tempId === tempId ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
      )
    );
  };

  const updateCartNote = (tempId: string, newNote: string) => {
    setCart((prev) =>
      prev.map((it) => (it.tempId === tempId ? { ...it, note: newNote } : it))
    );
  };

  const removeCartItem = (tempId: string) => {
    setCart((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const totalCups = cart.reduce((s, it) => s + it.quantity, 0);
  const totalAmount = cart.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

  const handlePlaceGuestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setToast({ message: 'Bạn hãy chọn ít nhất 1 món đồ uống vào giỏ nhé!', type: 'error' });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setToast({
        message: 'Vui lòng điền Họ tên, Số điện thoại và Địa chỉ nhận hàng nhé!',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress,
          expectedDeliveryAt: expectedDeliveryInput
            ? new Date(expectedDeliveryInput).toISOString()
            : new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          note: orderNote,
          items: cart,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể gửi đơn hàng');
      }

      setSubmittedOrder(json.order);
      setCart([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setToast({ message: err.message || 'Có lỗi xảy ra, vui lòng thử lại', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const allProducts = categories.flatMap((c) =>
    (c.products || []).map((p: any) => ({ ...p, categoryName: c.name, categoryId: c.id }))
  );

  const displayedProducts =
    activeCategoryId === 'ALL'
      ? allProducts
      : allProducts.filter((p) => p.categoryId === activeCategoryId);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-full">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Friendly Storefront Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-main)] border-b border-[var(--border-color)] h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl nocha-card text-xs font-bold hover:opacity-80 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-matcha-600" />
            <span className="hidden sm:inline">Về Trang Chủ</span>
          </Link>

          <Link href="/" className="flex items-center gap-2 min-w-0">
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
                Thanh Mát Từ Thiên Nhiên
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <ThemeToggleButton />

          <a
            href="tel:0989600992"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 text-matcha-700 dark:text-matcha-300 text-xs font-bold border border-matcha-300 dark:border-matcha-700"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>0989600992</span>
          </a>

          <a
            href="#checkout-box"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-black shadow-md whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>{totalCups} cốc</span>
            <span className="hidden sm:inline">• {totalAmount.toLocaleString('vi-VN')}đ</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 overflow-x-hidden">
        {/* ================================================================= */}
        {/* ORDER SUCCESS CONFIRMATION CARD (WHEN GUEST FINISHES ORDERING)    */}
        {/* ================================================================= */}
        {submittedOrder ? (
          <div className="max-w-2xl mx-auto nocha-card p-6 sm:p-8 text-center space-y-6 border-2 border-matcha-400 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-matcha-100 dark:bg-matcha-900/70 text-matcha-600 dark:text-matcha-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950">
                <Clock className="w-3.5 h-3.5" />
                TRẠNG THÁI: ĐANG CHỜ XÁC NHẬN
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                Cảm ơn {submittedOrder.customerName} đã đặt món!
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Đơn hàng <strong className="text-matcha-600">#{submittedOrder.orderCode}</strong> của
                bạn đã được gửi tới quầy pha chế NOCHA. Nhân viên sẽ gọi điện tới số{' '}
                <strong>{submittedOrder.customerPhone}</strong> trong ít phút để xác nhận đơn nhé!
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-left space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span className="font-bold text-[var(--text-muted)]">Mã đơn hàng:</span>
                <span className="font-mono font-black text-sm text-matcha-700 dark:text-matcha-300">
                  #{submittedOrder.orderCode}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 gap-2">
                <span className="font-bold text-[var(--text-muted)] shrink-0">Người nhận:</span>
                <span className="font-bold text-[var(--text-main)] text-right">
                  {submittedOrder.customerName} • {submittedOrder.customerPhone}
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-2 gap-3">
                <span className="font-bold text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                  <span>Địa chỉ giao hàng:</span>
                </span>
                <span className="font-extrabold text-[var(--text-main)] text-right">
                  {submittedOrder.shippingAddress}
                </span>
              </div>

              {submittedOrder.expectedDeliveryAt && (
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                  <span className="font-bold text-[var(--text-muted)]">Giờ nhận dự kiến:</span>
                  <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(submittedOrder.expectedDeliveryAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {submittedOrder.note && (
                <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-2 gap-3">
                  <span className="font-bold text-[var(--text-muted)] shrink-0">Lời nhắn đơn:</span>
                  <span className="font-semibold italic text-amber-600 dark:text-amber-400 text-right">
                    {submittedOrder.note}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {(submittedOrder.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">
                        {it.quantity}x {it.productName} ({it.selectedSize})
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Đường: {it.selectedSugar} • Đá: {it.selectedIce}
                        {it.note ? ` • Ghi chú: ${it.note}` : ''}
                      </div>
                    </div>
                    <span className="font-bold">
                      {(it.lineTotal || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-sm font-black">
                <span>Tổng tạm tính đồ uống:</span>
                <span className="text-base text-matcha-600 dark:text-matcha-400">
                  {(submittedOrder.finalAmount || 0).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>

            {/* Ô TEXT LINK XEM LẠI ĐƠN & NÚT COPY */}
            <div className="p-4 sm:p-5 rounded-2xl bg-matcha-50 dark:bg-matcha-950/60 border-2 border-matcha-300 dark:border-matcha-700 text-left space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-matcha-800 dark:text-matcha-300">
                  🔗 Link theo dõi &amp; xem lại đơn hàng của bạn:
                </label>
                <Link
                  href={`/order/${submittedOrder.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-matcha-600 dark:text-matcha-400 hover:underline"
                >
                  <span>Mở trang đơn</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getOrderTrackingUrl(submittedOrder.id)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-mono font-semibold text-[var(--text-main)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyOrderLink(submittedOrder.id)}
                  className="px-4 py-2.5 rounded-xl matcha-gradient-btn text-white text-xs font-black flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  {copiedLink ? (
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
              <p className="text-[11px] text-[var(--text-muted)]">
                Bạn hãy lưu lại link này để xem trạng thái xác nhận, tiến độ pha chế &amp; giao hàng bất kỳ lúc nào nhé!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/order/${submittedOrder.id}`}
                className="px-5 py-3 rounded-xl bg-[var(--bg-subtle)] border border-matcha-500 text-matcha-700 dark:text-matcha-300 font-extrabold text-xs sm:text-sm flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Xem Trang Đơn Hàng</span>
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedOrder(null)}
                className="px-6 py-3 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md"
              >
                + Đặt Thêm Đơn Mới
              </button>
              <a
                href="tel:0989600992"
                className="px-5 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs sm:text-sm flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-matcha-600" />
                <span>Gọi Hotline: 0989600992</span>
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Friendly Hero Banner */}
            <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-matcha-700 via-matcha-600 to-matcha-500 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>NOCHA — Matcha &amp; Coffee Online Order</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                  Chọn Món Yêu Thích • Giao Tận Cửa
                </h1>
                <p className="text-xs sm:text-sm text-matcha-50 max-w-xl">
                  Bạn chỉ cần chọn đồ uống, mức đường &amp; đá yêu thích. Ngay sau khi đặt, nhân viên
                  NOCHA sẽ alo xác nhận và pha chế tươi mới giao ngay cho bạn!
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs space-y-1.5 shrink-0 w-full md:w-auto">
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Tòa S2 Goldmark City
                </div>
                <div className="text-matcha-50">136 Hồ Tùng Mậu, Phú Diễn, Hà Nội</div>
                <div className="font-bold pt-1 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" /> Hotline/Zalo: 0989600992
                </div>
              </div>
            </div>

            {/* Storefront Grid: Left 7 cols Menu | Right 5 cols Cart & Checkout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* LEFT: MENU SELECTION */}
              <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-5">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId('ALL')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition ${
                      activeCategoryId === 'ALL'
                        ? 'matcha-gradient-btn text-white shadow-md'
                        : 'nocha-card text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    🍃 Tất Cả Đồ Uống
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition ${
                        activeCategoryId === cat.id
                          ? 'matcha-gradient-btn text-white shadow-md'
                          : 'nocha-card text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="nocha-card p-12 text-center text-sm text-[var(--text-muted)]">
                    Đang chuẩn bị thực đơn tươi mát...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => openCustomizeModal(prod)}
                        className="nocha-card overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-matcha-500 hover:shadow-xl transition duration-200"
                      >
                        <div>
                          <div className="h-48 bg-[#fbf8f1] dark:bg-[#17261b] relative overflow-hidden flex items-center justify-center p-4">
                            <img
                              src={prod.imageUrl || '/images/products/matcha-latte.jpg'}
                              alt={prod.name}
                              className="max-h-full max-w-[75%] w-auto h-auto object-contain rounded-xl group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-matcha-700/90 text-white backdrop-blur-sm">
                              {prod.categoryName}
                            </span>
                          </div>

                          <div className="p-4 space-y-1.5">
                            <h3 className="font-extrabold text-base text-[var(--text-main)]">
                              {prod.name}
                            </h3>
                            {prod.description && (
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                {prod.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-[var(--border-color)]">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block font-semibold">
                              Giá chỉ từ
                            </span>
                            <span className="font-black text-base text-matcha-600 dark:text-matcha-400">
                              {(prod.basePrice || 0).toLocaleString('vi-VN')}đ
                            </span>
                          </div>

                          <button
                            type="button"
                            className="px-3.5 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-extrabold flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Chọn món</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: FRIENDLY CART & DELIVERY CHECKOUT CARD */}
              <div id="checkout-box" className="lg:col-span-5 xl:col-span-4 min-w-0">
                <form
                  onSubmit={handlePlaceGuestOrder}
                  className="nocha-card p-5 sm:p-6 space-y-5 border-2 border-matcha-300 dark:border-matcha-700 shadow-lg sticky top-20"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl matcha-gradient-btn text-white flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-black text-base text-[var(--text-main)]">
                          Giỏ Đồ Uống Của Bạn
                        </h2>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {totalCups} cốc đã chọn
                        </p>
                      </div>
                    </div>

                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="text-xs font-bold text-rose-500 hover:underline"
                      >
                        Xóa giỏ
                      </button>
                    )}
                  </div>

                  {/* Cart Items */}
                  {cart.length === 0 ? (
                    <div className="py-8 px-4 text-center rounded-2xl bg-[var(--bg-subtle)] border border-dashed border-[var(--border-color)] space-y-2">
                      <Coffee className="w-8 h-8 text-matcha-500 mx-auto opacity-70" />
                      <div className="text-xs font-bold">Giỏ hàng của bạn đang trống</div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Hãy bấm vào món đồ uống bên cạnh để chọn Size, % Đường và % Đá nhé!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.tempId}
                          className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="font-extrabold text-sm truncate">
                                {item.productName}
                              </div>
                              <div className="text-[11px] text-matcha-700 dark:text-matcha-300 font-semibold">
                                Size: {item.selectedSize} • Đường: {item.selectedSugar} • Đá:{' '}
                                {item.selectedIce}
                              </div>
                              <div className="font-black text-matcha-600 dark:text-matcha-400 pt-0.5">
                                {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => removeCartItem(item.tempId)}
                                className="text-rose-500 hover:opacity-80 p-0.5"
                                title="Xóa món"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="flex items-center bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.tempId, -1)}
                                  className="px-2 py-1 font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 font-black">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.tempId, 1)}
                                  className="px-2 py-1 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Cho phép khách chỉnh sửa hoặc thêm ghi chú riêng cho từng món ngay trong giỏ */}
                          <div>
                            <input
                              type="text"
                              value={item.note}
                              onChange={(e) => updateCartNote(item.tempId, e.target.value)}
                              placeholder="📝 Ghi chú món này (VD: tên người uống, để đá riêng...)"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-matcha-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer Delivery Information */}
                  <div className="space-y-3 pt-2 border-t border-[var(--border-color)] text-xs">
                    <div className="font-extrabold text-xs uppercase tracking-wider text-matcha-700 dark:text-matcha-400">
                      Thông Tin Nhận Đồ Uống
                    </div>

                    <div>
                      <label className="block font-bold mb-1">
                        Tên của bạn <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="VD: Chị Lan / Anh Minh"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">
                        Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Nhập SĐT để NOCHA gọi xác nhận..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">
                        Địa chỉ giao hàng <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                        <textarea
                          rows={2}
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Nhập địa chỉ nhận hàng..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">
                        Giờ nhận đồ dự kiến <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {[
                          { label: 'Giao ngay (~20p)', mins: 20 },
                          { label: '+30 phút', mins: 30 },
                          { label: '+45 phút', mins: 45 },
                          { label: '+1 tiếng', mins: 60 },
                        ].map((opt) => (
                          <button
                            key={opt.mins}
                            type="button"
                            onClick={() => setQuickDeliveryMinutes(opt.mins)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-matcha-100 dark:hover:bg-matcha-900 text-[11px] font-bold text-matcha-700 dark:text-matcha-300 border border-[var(--border-color)] transition"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-matcha-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="datetime-local"
                          value={expectedDeliveryInput}
                          onChange={(e) => setExpectedDeliveryInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold focus:outline-none focus:border-matcha-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Lời nhắn cho quán (Tuỳ chọn)</label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder="VD: Giao xuống sảnh gọi mình nhé..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-medium focus:outline-none focus:border-matcha-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total & Submit Button */}
                  <div className="p-4 rounded-2xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-sm font-black">
                      <span>Tổng tiền đồ uống ({totalCups} cốc):</span>
                      <span className="text-lg text-matcha-600 dark:text-matcha-400">
                        {totalAmount.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      * Nhân viên NOCHA sẽ liên hệ qua SĐT của bạn ngay để xác nhận đơn hàng &amp; ưu đãi phí giao hàng.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || cart.length === 0}
                    className="w-full py-3.5 rounded-2xl matcha-gradient-btn font-black text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{submitting ? 'ĐANG GỬI ĐƠN HÀNG...' : 'ĐẶT ĐƠN NGAY'}</span>
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ================================================================= */}
      {/* DRINK CUSTOMIZATION MODAL FOR GUEST                               */}
      {/* ================================================================= */}
      {pickingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="nocha-card w-full max-w-md p-5 sm:p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setPickingProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-[var(--border-color)] pb-3">
              <img
                src={pickingProduct.imageUrl || '/images/products/matcha-latte.jpg'}
                alt={pickingProduct.name}
                className="w-16 h-16 rounded-2xl object-cover border border-[var(--border-color)]"
              />
              <div>
                <span className="text-[10px] font-bold uppercase text-matcha-600 dark:text-matcha-400">
                  Tuỳ chọn theo sở thích
                </span>
                <h3 className="text-lg font-black text-[var(--text-main)]">
                  {pickingProduct.name}
                </h3>
                <div className="text-sm font-black text-matcha-600 dark:text-matcha-400">
                  {currentModalUnitPrice.toLocaleString('vi-VN')} đ / cốc
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Size */}
              <div>
                <label className="block font-bold mb-1.5">1. Chọn Size Cốc</label>
                <div className="grid grid-cols-3 gap-2">
                  {(pickingProduct.sizes || []).map((sz: any, i: number) => {
                    const active = pickSize.name === sz.name;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPickSize(sz)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition ${
                          active
                            ? 'matcha-gradient-btn text-white border-transparent shadow-sm'
                            : 'bg-[var(--bg-subtle)] border-[var(--border-color)]'
                        }`}
                      >
                        <div>{sz.name}</div>
                        <div className="text-[10px] opacity-85">
                          {Number(sz.price) > 0
                            ? `+${Number(sz.price).toLocaleString('vi-VN')}đ`
                            : Number(sz.price) < 0
                            ? `${Number(sz.price).toLocaleString('vi-VN')}đ`
                            : 'Giá chuẩn'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sugar */}
              <div>
                <label className="block font-bold mb-1.5">2. Mức Đường (% Ngọt)</label>
                <div className="flex flex-wrap gap-2">
                  {(pickingProduct.sugars || []).map((sg: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPickSugar(sg)}
                      className={`px-3.5 py-2 rounded-xl border font-bold transition ${
                        pickSugar === sg
                          ? 'matcha-gradient-btn text-white border-transparent'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-color)]'
                      }`}
                    >
                      {sg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ice */}
              <div>
                <label className="block font-bold mb-1.5">3. Mức Đá</label>
                <div className="flex flex-wrap gap-2">
                  {(pickingProduct.ices || []).map((ic: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPickIce(ic)}
                      className={`px-3.5 py-2 rounded-xl border font-bold transition ${
                        pickIce === ic
                          ? 'matcha-gradient-btn text-white border-transparent'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-color)]'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold mb-1">Số Lượng (Cốc)</label>
                  <div className="flex items-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPickQty(Math.max(1, pickQty - 1))}
                      className="p-2.5 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-black text-sm">{pickQty}</span>
                    <button
                      type="button"
                      onClick={() => setPickQty(pickQty + 1)}
                      className="p-2.5 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Ghi chú thêm cho ly này</label>
                  <input
                    type="text"
                    value={pickNote}
                    onChange={(e) => setPickNote(e.target.value)}
                    placeholder="VD: Ít sốt caramel..."
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-[var(--text-muted)]">Tạm tính: </span>
                <strong className="text-base font-black text-matcha-600 dark:text-matcha-400">
                  {(currentModalUnitPrice * pickQty).toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="px-6 py-3 rounded-xl matcha-gradient-btn font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>THÊM VÀO GIỎ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

