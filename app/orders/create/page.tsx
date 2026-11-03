'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  FileText,
  Truck,
  Percent,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Sparkles,
  Clock,
  X,
} from 'lucide-react';

interface CartItem {
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
  itemDiscount: number;
  note: string;
  availableSizes: { name: string; price: number }[];
  availableSugars: string[];
  availableIces: string[];
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state for configuring product before adding to order
  const [pickingProduct, setPickingProduct] = useState<any | null>(null);
  const [pickQty, setPickQty] = useState(1);
  const [pickSize, setPickSize] = useState<{ name: string; price: number }>({
    name: 'M (500ml)',
    price: 0,
  });
  const [pickSugar, setPickSugar] = useState('100%');
  const [pickIce, setPickIce] = useState('100% đá');
  const [pickUnitPrice, setPickUnitPrice] = useState(35000);
  const [pickDiscount, setPickDiscount] = useState(0);
  const [pickNote, setPickNote] = useState('');

  // Order Cart & Customer State
  const toLocalDateTimeInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customCreatedAtInput, setCustomCreatedAtInput] = useState<string>(() =>
    toLocalDateTimeInput(new Date())
  );
  const [expectedDeliveryInput, setExpectedDeliveryInput] = useState<string>(() =>
    toLocalDateTimeInput(new Date(Date.now() + 20 * 60 * 1000))
  );
  const [orderNote, setOrderNote] = useState('');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [isFreeShip, setIsFreeShip] = useState<boolean>(true);
  const [shippingFee, setShippingFee] = useState<number>(0);

  const setQuickCreatedDaysAgo = (daysAgo: number) => {
    const dt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    setCustomCreatedAtInput(toLocalDateTimeInput(dt));
    // Đồng bộ luôn giờ nhận dự kiến = giờ tạo đơn + 20 phút khi nhập bù đơn cũ
    setExpectedDeliveryInput(toLocalDateTimeInput(new Date(dt.getTime() + 20 * 60 * 1000)));
  };

  const setQuickDeliveryMinutes = (minutesFromNow: number) => {
    setExpectedDeliveryInput(
      toLocalDateTimeInput(new Date(Date.now() + minutesFromNow * 60 * 1000))
    );
  };

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
          loadMenuData();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const loadMenuData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products?activeOnly=true'),
      ]);
      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategories((catJson.categories || []).filter((c: any) => c.isActive));
      }
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        setProducts(prodJson.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const parseJsonSafe = (str: string, fallback: any) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const openPickModal = (prod: any) => {
    const sizes = parseJsonSafe(prod.sizesJson, [{ name: 'M (500ml)', price: 0 }]);
    const sugars = parseJsonSafe(prod.sugarOptionsJson, ['0%', '30%', '50%', '70%', '100%']);
    const ices = parseJsonSafe(prod.iceOptionsJson, ['0%', '30%', '50%', '70%', '100%', 'Đá riêng']);

    const defaultSize =
      sizes.find((s: any) => s.name.includes('M') || s.price === 0) ||
      sizes[0] || { name: 'M (500ml)', price: 0 };
    const defaultSugar = sugars.includes('100%') ? '100%' : sugars[sugars.length - 1] || '100%';
    const defaultIce =
      ices.find((ic: string) => ic.includes('100%')) || ices[ices.length - 1] || '100%';

    setPickingProduct({ ...prod, sizes, sugars, ices });
    setPickQty(1);
    setPickSize(defaultSize);
    setPickSugar(defaultSugar);
    setPickIce(defaultIce);
    setPickUnitPrice(Math.max(0, (prod.basePrice || 0) + (Number(defaultSize.price) || 0)));
    setPickDiscount(0);
    setPickNote('');
  };

  const handleSizeSelectInModal = (sz: { name: string; price: number }) => {
    setPickSize(sz);
    if (pickingProduct) {
      setPickUnitPrice(Math.max(0, (pickingProduct.basePrice || 0) + (Number(sz.price) || 0)));
    }
  };

  const confirmAddProductToCart = () => {
    if (!pickingProduct) return;

    const newItem: CartItem = {
      tempId: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: pickingProduct.id,
      productName: pickingProduct.name,
      productImage: pickingProduct.imageUrl,
      quantity: Math.max(1, pickQty),
      selectedSize: pickSize.name,
      sizeExtraPrice: Number(pickSize.price) || 0,
      selectedSugar: pickSugar,
      selectedIce: pickIce,
      unitPrice: Math.max(0, Number(pickUnitPrice) || 0),
      itemDiscount: Math.max(0, Number(pickDiscount) || 0),
      note: pickNote.trim(),
      availableSizes: pickingProduct.sizes || [],
      availableSugars: pickingProduct.sugars || [],
      availableIces: pickingProduct.ices || [],
    };

    setCart((prev) => [...prev, newItem]);
    setPickingProduct(null);
  };

  const updateCartItem = (tempId: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((it) => (it.tempId === tempId ? { ...it, ...patch } : it))
    );
  };

  const duplicateCartItem = (item: CartItem) => {
    const copy: CartItem = {
      ...item,
      tempId: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      quantity: 1,
    };
    setCart((prev) => [...prev, copy]);
  };

  const removeCartItem = (tempId: string) => {
    setCart((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const subtotalAmount = cart.reduce((sum, it) => {
    const line = Math.max(0, it.unitPrice * it.quantity - it.itemDiscount);
    return sum + line;
  }, 0);

  const netRevenue = Math.max(0, subtotalAmount - (Number(orderDiscount) || 0));
  const effectiveShipFee = isFreeShip ? 0 : Math.max(0, Number(shippingFee) || 0);
  const finalAmount = netRevenue + effectiveShipFee;

  const applyOrderDiscountPct = (pct: number) => {
    setOrderDiscount(Math.round((subtotalAmount * pct) / 100));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setToast({ message: 'Vui lòng chọn ít nhất 1 món vào đơn hàng', type: 'error' });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setToast({
        message: 'Vui lòng nhập đầy đủ Tên người nhận, SĐT và Địa chỉ giao hàng',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          shippingAddress,
          ...(user?.role === 'ADMIN' && customCreatedAtInput
            ? { customCreatedAt: new Date(customCreatedAtInput).toISOString() }
            : {}),
          expectedDeliveryAt: expectedDeliveryInput
            ? new Date(expectedDeliveryInput).toISOString()
            : new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          note: orderNote,
          orderDiscount: Number(orderDiscount) || 0,
          isFreeShip,
          shippingFee: effectiveShipFee,
          items: cart,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tạo đơn hàng');
      }

      setToast({ message: `Đã tạo đơn ${json.order.orderCode} thành công!`, type: 'success' });
      setTimeout(() => {
        router.push('/orders');
      }, 600);
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi hệ thống', type: 'error' });
      setSubmitting(false);
    }
  };

  const filteredProducts =
    selectedCatId === 'ALL'
      ? products
      : products.filter((p) => p.categoryId === selectedCatId);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto space-y-6">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-matcha-600" />
                Lên Đơn Hàng Mới (NOCHA POS)
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Chọn món, cấu hình Size, % Đường, % Đá, chiết khấu và thông tin giao hàng
              </p>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl nocha-card text-xs font-bold hover:opacity-80 self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Danh sách đơn hàng</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT 7 COLS: PRODUCT SELECTION */}
            <div className="xl:col-span-7 space-y-4">
              {/* Category Filter Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCatId('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCatId === 'ALL'
                      ? 'matcha-gradient-btn text-white shadow-sm'
                      : 'nocha-card text-[var(--text-muted)]'
                  }`}
                >
                  Tất Cả ({products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCatId(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      selectedCatId === c.id
                        ? 'matcha-gradient-btn text-white shadow-sm'
                        : 'nocha-card text-[var(--text-muted)]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              {loading ? (
                <div className="nocha-card p-12 text-center text-xs text-[var(--text-muted)]">
                  Đang tải danh sách đồ uống...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => openPickModal(prod)}
                      className="nocha-card p-3 text-left flex flex-col justify-between hover:border-matcha-500 hover:shadow-md transition group"
                    >
                      <div>
                        <div className="h-36 sm:h-40 rounded-xl overflow-hidden bg-[#fbf8f1] dark:bg-[#17261b] mb-2.5 relative flex items-center justify-center p-3">
                          <img
                            src={prod.imageUrl || '/images/products/matcha-latte.jpg'}
                            alt={prod.name}
                            className="max-h-full max-w-[78%] w-auto h-auto object-contain rounded-lg group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-matcha-700 text-white flex items-center justify-center shadow">
                            <Plus className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-matcha-600 dark:text-matcha-400 uppercase">
                          {prod.category?.name}
                        </div>
                        <div className="font-extrabold text-xs sm:text-sm text-matcha-900 dark:text-matcha-100 line-clamp-1 mt-0.5">
                          {prod.name}
                        </div>
                      </div>
                      <div className="font-black text-sm text-matcha-700 dark:text-matcha-300 mt-1.5">
                        {(prod.basePrice || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Items List (Editable per-row) */}
              <div className="nocha-card p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <h3 className="font-black text-sm sm:text-base text-matcha-900 dark:text-matcha-100">
                    Danh Sách Món Trong Đơn ({cart.reduce((s, i) => s + i.quantity, 0)} cốc)
                  </h3>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-xs font-bold text-rose-500 hover:underline"
                    >
                      Xóa hết món
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                    Chưa có món nào. Hãy bấm vào sản phẩm ở trên để chọn Size, % Đường, % Đá!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, index) => {
                      const lineTotal = Math.max(
                        0,
                        item.unitPrice * item.quantity - item.itemDiscount
                      );
                      return (
                        <div
                          key={item.tempId}
                          className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-matcha-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <div className="font-extrabold text-sm text-matcha-900 dark:text-matcha-100">
                                  {item.productName}
                                </div>
                                <div className="text-[11px] text-matcha-700 dark:text-matcha-300 font-semibold">
                                  Size: {item.selectedSize} • Đường: {item.selectedSugar} • Đá:{' '}
                                  {item.selectedIce}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => duplicateCartItem(item)}
                                title="Tách/Nhân bản dòng để chọn Đường/Đá khác"
                                className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:opacity-80 text-matcha-700 dark:text-matcha-300 border border-[var(--border-color)]"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCartItem(item.tempId)}
                                title="Xóa dòng này"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Row inline controls: Quantity, Size, Sugar, Ice */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Quantity */}
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Số lượng
                              </label>
                              <div className="flex items-center bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItem(item.tempId, {
                                      quantity: Math.max(1, item.quantity - 1),
                                    })
                                  }
                                  className="px-2.5 py-1.5 hover:bg-[var(--bg-subtle)] font-bold"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center font-black">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItem(item.tempId, { quantity: item.quantity + 1 })
                                  }
                                  className="px-2.5 py-1.5 hover:bg-[var(--bg-subtle)] font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Size */}
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Size
                              </label>
                              <select
                                value={item.selectedSize}
                                onChange={(e) => {
                                  const sz = item.availableSizes.find(
                                    (s) => s.name === e.target.value
                                  );
                                  const extra = sz ? Number(sz.price) || 0 : 0;
                                  const base = item.unitPrice - item.sizeExtraPrice;
                                  updateCartItem(item.tempId, {
                                    selectedSize: e.target.value,
                                    sizeExtraPrice: extra,
                                    unitPrice: Math.max(0, base + extra),
                                  });
                                }}
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {item.availableSizes.map((s, idx) => (
                                  <option key={idx} value={s.name}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Sugar */}
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                % Đường
                              </label>
                              <select
                                value={item.selectedSugar}
                                onChange={(e) =>
                                  updateCartItem(item.tempId, { selectedSugar: e.target.value })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {item.availableSugars.map((sg, idx) => (
                                  <option key={idx} value={sg}>
                                    {sg}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Ice */}
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                % Đá
                              </label>
                              <select
                                value={item.selectedIce}
                                onChange={(e) =>
                                  updateCartItem(item.tempId, { selectedIce: e.target.value })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold"
                              >
                                {item.availableIces.map((ic, idx) => (
                                  <option key={idx} value={ic}>
                                    {ic}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Row inline: Unit Price at sale time, Item Discount, Item Note */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Đơn giá bán (VNĐ)
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateCartItem(item.tempId, {
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
                                value={item.itemDiscount}
                                onChange={(e) =>
                                  updateCartItem(item.tempId, {
                                    itemDiscount: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-amber-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                Ghi chú riêng món này
                              </label>
                              <input
                                type="text"
                                value={item.note}
                                onChange={(e) =>
                                  updateCartItem(item.tempId, { note: e.target.value })
                                }
                                placeholder="VD: Ít sốt caramel..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              Thành tiền dòng ({item.quantity} x{' '}
                              {item.unitPrice.toLocaleString('vi-VN')}đ
                              {item.itemDiscount > 0
                                ? ` - CK ${item.itemDiscount.toLocaleString('vi-VN')}đ`
                                : ''}
                              ):
                            </span>
                            <span className="font-black text-sm text-matcha-700 dark:text-matcha-300">
                              {lineTotal.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 5 COLS: CUSTOMER INFO, DISCOUNTS, SHIPPING & SUBMIT */}
            <div className="xl:col-span-5">
              <form onSubmit={handleSubmitOrder} className="nocha-card p-5 sm:p-6 space-y-5 sticky top-2">
                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100 border-b border-[var(--border-color)] pb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-matcha-600" />
                  Thông Tin Giao Hàng &amp; Thanh Toán
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold mb-1">
                      Tên Người Nhận <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="VD: Chị Hương (S2.1508)"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Số Điện Thoại Người Nhận <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="VD: 0989600992"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Địa Chỉ Giao Hàng <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                      <textarea
                        rows={2}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Nhập địa chỉ giao hàng..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold focus:outline-none focus:border-matcha-600"
                        required
                      />
                    </div>
                  </div>

                  {/* Ngày Tạo Đơn (Chỉ hiển thị cho Admin để kế toán/quản trị nhập bù đơn từ hôm trước) */}
                  {user?.role === 'ADMIN' && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label className="block font-extrabold text-amber-700 dark:text-amber-300">
                          📅 Ngày &amp; Giờ Tạo Đơn (Quyền Admin nhập bù)
                        </label>
                        <div className="flex items-center gap-1">
                          {[
                            { label: 'Hôm nay', days: 0 },
                            { label: 'Hôm qua (-1 ngày)', days: 1 },
                            { label: 'Hôm kia (-2 ngày)', days: 2 },
                          ].map((dOpt) => (
                            <button
                              key={dOpt.days}
                              type="button"
                              onClick={() => setQuickCreatedDaysAgo(dOpt.days)}
                              className="px-2 py-0.5 rounded-lg bg-[var(--bg-card)] hover:bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 transition"
                            >
                              {dOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="datetime-local"
                          value={customCreatedAtInput}
                          onChange={(e) => setCustomCreatedAtInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-card)] border border-amber-500/40 font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold mb-1">
                      Giờ Nhận Đồ Dự Kiến <span className="text-rose-500">*</span>
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold focus:outline-none focus:border-matcha-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Ghi Chú Chung Cả Đơn</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        placeholder="VD: Giao xuống sảnh gọi khách, lấy thêm ống hút..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-medium focus:outline-none focus:border-matcha-600"
                      />
                    </div>
                  </div>

                  {/* Order Discount */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-600" />
                        Chiết Khấu Chung Cả Đơn (VNĐ)
                      </label>
                      <div className="flex gap-1">
                        {[0, 5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyOrderDiscountPct(pct)}
                            className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold hover:border-matcha-500"
                          >
                            {pct === 0 ? '0đ' : `-${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-amber-600"
                    />
                  </div>

                  {/* Shipping Fee or Free Ship */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-matcha-600" />
                        Phí Vận Chuyển (Không tính vào Doanh thu)
                      </span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-matcha-700 dark:text-matcha-300">
                        <input
                          type="checkbox"
                          checked={isFreeShip}
                          onChange={(e) => {
                            setIsFreeShip(e.target.checked);
                            if (e.target.checked) setShippingFee(0);
                          }}
                          className="rounded accent-matcha-600 w-4 h-4"
                        />
                        <span>Miễn phí ship</span>
                      </label>
                    </div>

                    {!isFreeShip && (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))}
                          placeholder="Nhập phí ship (VNĐ)"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
                        />
                        <div className="flex gap-1.5">
                          {[5000, 10000, 15000, 20000, 30000].map((fee) => (
                            <button
                              key={fee}
                              type="button"
                              onClick={() => setShippingFee(fee)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold"
                            >
                              {fee / 1000}k
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded-2xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 space-y-2 text-xs">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Tạm tính các món ({cart.reduce((s, i) => s + i.quantity, 0)} cốc):</span>
                    <span className="font-bold text-[var(--text-main)]">
                      {subtotalAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Chiết khấu cả đơn:</span>
                    <span className="font-bold text-amber-600">
                      - {(Number(orderDiscount) || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-matcha-200 dark:border-matcha-800 font-bold text-matcha-800 dark:text-matcha-300">
                    <span>Doanh thu thuần (Không gồm ship):</span>
                    <span>{netRevenue.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Phí ship giao hàng:</span>
                    <span className="font-semibold">
                      {isFreeShip ? 'Miễn phí (0 đ)' : `${effectiveShipFee.toLocaleString('vi-VN')} đ`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-matcha-300 dark:border-matcha-700 text-sm sm:text-base font-black text-matcha-900 dark:text-matcha-100">
                    <span>TỔNG THU KHÁCH:</span>
                    <span className="text-lg text-matcha-700 dark:text-matcha-300">
                      {finalAmount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full py-3.5 rounded-xl matcha-gradient-btn font-black text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{submitting ? 'ĐANG TẠO ĐƠN...' : 'XÁC NHẬN TẠO ĐƠN HÀNG'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* ================================================================= */}
          {/* MODAL CONFIGURE PRODUCT OPTIONS (SIZE, % ĐƯỜNG, % ĐÁ, CHIẾT KHẤU) */}
          {/* ================================================================= */}
          {pickingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="nocha-card w-full max-w-lg p-5 sm:p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
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
                      Tuỳ chọn pha chế
                    </span>
                    <h3 className="text-lg font-black text-matcha-900 dark:text-matcha-100">
                      {pickingProduct.name}
                    </h3>
                    <div className="text-xs font-bold text-matcha-700 dark:text-matcha-300">
                      Giá gốc: {(pickingProduct.basePrice || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Size Selection */}
                  <div>
                    <label className="block font-bold mb-1.5">1. Chọn Size Cốc</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(pickingProduct.sizes || []).map((sz: any, i: number) => {
                        const active = pickSize.name === sz.name;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSizeSelectInModal(sz)}
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

                  {/* % Sugar Selection */}
                  <div>
                    <label className="block font-bold mb-1.5">2. Chọn % Đường</label>
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

                  {/* % Ice Selection */}
                  <div>
                    <label className="block font-bold mb-1.5">3. Chọn % Đá</label>
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

                  {/* Quantity, Unit Price & Item Discount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block font-bold mb-1">Số Lượng (Cốc)</label>
                      <div className="flex items-center bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPickQty(Math.max(1, pickQty - 1))}
                          className="p-2.5 font-bold hover:opacity-80"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-black text-sm">{pickQty}</span>
                        <button
                          type="button"
                          onClick={() => setPickQty(pickQty + 1)}
                          className="p-2.5 font-bold hover:opacity-80"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Giá Bán Lúc Này (VNĐ)</label>
                      <input
                        type="number"
                        value={pickUnitPrice}
                        onChange={(e) => setPickUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Chiết Khấu Món (VNĐ)</label>
                      <input
                        type="number"
                        value={pickDiscount}
                        onChange={(e) => setPickDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-amber-600"
                      />
                    </div>
                  </div>

                  {/* Item Note */}
                  <div>
                    <label className="block font-bold mb-1">Ghi Chú Cho Món Này</label>
                    <input
                      type="text"
                      value={pickNote}
                      onChange={(e) => setPickNote(e.target.value)}
                      placeholder="VD: Ít sốt caramel, khuấy đều trước..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">Thành tiền: </span>
                    <strong className="text-base font-black text-matcha-700 dark:text-matcha-300">
                      {Math.max(0, pickUnitPrice * pickQty - pickDiscount).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={confirmAddProductToCart}
                    className="px-6 py-3 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>THÊM VÀO ĐƠN</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

