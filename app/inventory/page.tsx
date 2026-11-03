'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import InventorySubNav from '@/components/InventorySubNav';
import {
  PackagePlus,
  Search,
  Edit3,
  Trash2,
  Calendar,
  RefreshCw,
  Check,
  X,
  Boxes,
} from 'lucide-react';

function getTodayDateTimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

export default function InventoryEntriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalCalculated: 0,
    totalAdjusted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states for creating / editing an inventory entry
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formCategoryFilter, setFormCategoryFilter] = useState<string>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [isAdjustedManually, setIsAdjustedManually] = useState<boolean>(false);
  const [entryDate, setEntryDate] = useState<string>(getTodayDateTimeLocal());
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Filter states for the entries list
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const calculatedAmount = Math.round((Number(unitPrice) || 0) * (Number(quantity) || 0));

  const applySelectedItemDefaults = useCallback(
    (itemObj: any, currentQty: number) => {
      if (!itemObj) return;
      const refPrice = Number(itemObj.referencePrice) || 0;
      const calc = Math.round(refPrice * (Number(currentQty) || 1));
      setUnit(itemObj.unit || 'cái');
      setUnitPrice(refPrice);
      setAdjustedAmount(calc);
      setIsAdjustedManually(false);
    },
    []
  );

  const loadMasterData = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch('/api/inventory/categories'),
        fetch('/api/inventory/items'),
      ]);
      const catJson = await catRes.json();
      const itemJson = await itemRes.json();

      if (catJson.categories) setCategories(catJson.categories);
      if (itemJson.items) {
        setItems(itemJson.items);
        if (itemJson.items.length > 0 && !selectedItemId) {
          const first = itemJson.items[0];
          setSelectedItemId(first.id);
          applySelectedItemDefaults(first, 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedItemId, applySelectedItemDefaults]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterCategoryId !== 'ALL') qs.set('categoryId', filterCategoryId);
      if (filterFromDate) qs.set('fromDate', filterFromDate);
      if (filterToDate) qs.set('toDate', filterToDate);
      if (filterSearch.trim()) qs.set('search', filterSearch.trim());

      const res = await fetch(`/api/inventory/entries?${qs.toString()}`);
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCategoryId, filterFromDate, filterToDate, filterSearch]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) {
          router.push('/login');
        } else if (d.user.role !== 'ADMIN') {
          router.push('/dashboard');
        } else {
          setUser(d.user);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadMasterData();
  }, [user, loadMasterData]);

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user, loadEntries]);

  const handleSelectItemChange = (newItemId: string) => {
    setSelectedItemId(newItemId);
    const found = items.find((i) => i.id === newItemId);
    if (found) {
      applySelectedItemDefaults(found, quantity);
    }
  };

  const handleUnitPriceChange = (newPrice: number) => {
    const cleanPrice = Math.max(0, newPrice);
    setUnitPrice(cleanPrice);
    if (!isAdjustedManually) {
      setAdjustedAmount(Math.round(cleanPrice * (Number(quantity) || 0)));
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const cleanQty = Math.max(0.01, newQty);
    setQuantity(cleanQty);
    if (!isAdjustedManually) {
      setAdjustedAmount(Math.round((Number(unitPrice) || 0) * cleanQty));
    }
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setEntryDate(getTodayDateTimeLocal());
    setNote('');
    setQuantity(1);
    const first = items.find((i) => i.id === selectedItemId) || items[0];
    if (first) {
      setSelectedItemId(first.id);
      applySelectedItemDefaults(first, 1);
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setFormCategoryFilter('ALL');
    setSelectedItemId(entry.itemId);
    setUnit(entry.unit || 'cái');
    setUnitPrice(Number(entry.unitPrice) || 0);
    setQuantity(Number(entry.quantity) || 1);
    setAdjustedAmount(Number(entry.adjustedAmount) || 0);
    setIsAdjustedManually(Number(entry.adjustedAmount) !== Number(entry.calculatedAmount));
    const dt = entry.entryDate ? new Date(entry.entryDate) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setEntryDate(
      `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
        dt.getHours()
      )}:${pad(dt.getMinutes())}`
    );
    setNote(entry.note || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setToast({ message: 'Vui lòng chọn sản phẩm kho', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingEntryId
        ? `/api/inventory/entries/${editingEntryId}`
        : '/api/inventory/entries';
      const method = editingEntryId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          unit,
          unitPrice,
          quantity,
          calculatedAmount,
          adjustedAmount,
          entryDate: entryDate ? new Date(entryDate).toISOString() : new Date().toISOString(),
          note,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể lưu phiếu nhập kho');
      }

      setToast({
        message: editingEntryId
          ? 'Đã cập nhật phiếu nhập kho thành công!'
          : 'Đã ghi nhận phiếu nhập kho mới!',
        type: 'success',
      });
      resetForm();
      loadEntries();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!confirm(`Xác nhận xóa phiếu nhập kho [${entry.entryCode} - ${entry.itemName}]?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/entries/${entry.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast({ message: `Đã xóa phiếu nhập ${entry.entryCode}`, type: 'success' });
        if (editingEntryId === entry.id) resetForm();
        loadEntries();
      }
    } catch {
      setToast({ message: 'Không thể xóa phiếu nhập kho', type: 'error' });
    }
  };

  const selectableItems =
    formCategoryFilter === 'ALL'
      ? items
      : items.filter((i) => i.categoryId === formCategoryFilter);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto overflow-x-hidden space-y-6">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          <InventorySubNav />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <PackagePlus className="w-6 h-6 text-matcha-600" />
                Quản Lý Nhập Kho &amp; Chi Phí Đầu Vào
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Chọn sản phẩm kho để tự động lấy Giá nhập tham khảo &amp; Đơn vị tính, hỗ trợ điều chỉnh thực chi và ngày nhập
              </p>
            </div>

            <Link
              href="/inventory/items"
              className="px-4 py-2 rounded-xl nocha-card text-xs font-extrabold text-matcha-700 dark:text-matcha-300 hover:border-matcha-500 flex items-center gap-2 self-start sm:self-auto"
            >
              <Boxes className="w-4 h-4" />
              <span>+ Thêm Mặt Hàng Kho Mới</span>
            </Link>
          </div>

          {/* ================================================================= */}
          {/* FORM NHẬP KHO (TẠO PHIẾU NHẬP MỚI / SỬA PHIẾU NHẬP)                */}
          {/* ================================================================= */}
          <form
            onSubmit={handleSubmitEntry}
            className="nocha-card p-5 sm:p-6 space-y-4 border-2 border-matcha-300 dark:border-matcha-800 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg matcha-gradient-btn text-white text-xs font-black">
                  {editingEntryId ? 'CHỈNH SỬA PHIẾU NHẬP' : 'TẠO PHIẾU NHẬP KHO MỚI'}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-semibold hidden sm:inline">
                  Chọn mặt hàng kho, hệ thống tự động điền giá tham khảo &amp; đơn vị tính
                </span>
              </div>

              {editingEntryId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-bold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy sửa</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Lọc nhanh danh mục để chọn SP */}
              <div>
                <label className="block font-bold mb-1 text-[var(--text-muted)]">
                  Lọc theo Danh mục
                </label>
                <select
                  value={formCategoryFilter}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setFormCategoryFilter(cat);
                    const nextList =
                      cat === 'ALL' ? items : items.filter((i) => i.categoryId === cat);
                    if (nextList.length > 0) {
                      handleSelectItemChange(nextList[0].id);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                >
                  <option value="ALL">Tất cả danh mục kho</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Sản phẩm kho */}
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block font-bold mb-1">
                  Chọn Sản Phẩm / Dịch Vụ Nhập Kho *
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleSelectItemChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-extrabold text-matcha-900 dark:text-matcha-100"
                  required
                >
                  {selectableItems.length === 0 ? (
                    <option value="">-- Chưa có sản phẩm trong danh mục này --</option>
                  ) : (
                    selectableItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        [{it.categoryName}] {it.name} — Giá TK:{' '}
                        {(it.referencePrice || 0).toLocaleString('vi-VN')}đ/{it.unit}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Ngày nhập */}
              <div>
                <label className="block font-bold mb-1">Ngày &amp; Giờ Nhập Kho *</label>
                <input
                  type="datetime-local"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              {/* Đơn vị tính (tự load, cho sửa) */}
              <div>
                <label className="block font-bold mb-1">Đơn Vị Tính (Cho phép sửa)</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="gói, hộp, cái, kg..."
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                  required
                />
              </div>

              {/* Giá nhập (tự load từ giá tham khảo, cho sửa) */}
              <div>
                <label className="block font-bold mb-1">
                  Đơn Giá Nhập (VNĐ) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(Number(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-black text-matcha-700 dark:text-matcha-300"
                  required
                />
              </div>

              {/* Số lượng */}
              <div>
                <label className="block font-bold mb-1">Số Lượng Nhập *</label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-black"
                  required
                />
              </div>

              {/* Tổng tiền tạm tính (Read-only = Đơn giá x Số lượng) */}
              <div>
                <label className="block font-bold mb-1 text-[var(--text-muted)]">
                  Tổng Tiền Tạm Tính (VNĐ)
                </label>
                <div className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-extrabold text-[var(--text-muted)]">
                  {calculatedAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* Tổng tiền điều chỉnh (Tự load từ tạm tính nhưng cho Admin sửa) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-amber-700 dark:text-amber-300">
                    Tổng Tiền Điều Chỉnh (Thực Chi) *
                  </label>
                  {isAdjustedManually && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustedAmount(calculatedAmount);
                        setIsAdjustedManually(false);
                      }}
                      className="text-[10px] font-bold text-matcha-600 hover:underline flex items-center gap-0.5"
                      title="Đặt lại bằng Tổng tiền tạm tính"
                    >
                      <RefreshCw className="w-3 h-3" /> Theo tạm tính
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={adjustedAmount}
                  onChange={(e) => {
                    setAdjustedAmount(Math.max(0, Number(e.target.value) || 0));
                    setIsAdjustedManually(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 font-black text-amber-700 dark:text-amber-300 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 text-xs">
              <div className="flex-1">
                <label className="block font-bold mb-1">Ghi Chú Nhập Kho</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú nhà cung cấp, chiết khấu, người mua hoặc lý do phát sinh..."
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl matcha-gradient-btn font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Đang lưu...'
                    : editingEntryId
                    ? 'LƯU CẬP NHẬT PHIẾU NHẬP'
                    : 'GHI NHẬN NHẬP KHO'}
                </span>
              </button>
            </div>
          </form>

          {/* ================================================================= */}
          {/* BỘ LỌC & THỐNG KÊ LỊCH SỬ NHẬP KHO                                */}
          {/* ================================================================= */}
          <div className="nocha-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600" />
                  <span className="text-[var(--text-muted)] font-semibold">Từ ngày:</span>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600" />
                  <span className="text-[var(--text-muted)] font-semibold">Đến ngày:</span>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none"
                  />
                </div>

                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                >
                  <option value="ALL">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Tìm tên SP, mã phiếu, ghi chú..."
                    className="pl-8 pr-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                  />
                </div>

                {(filterFromDate || filterToDate || filterCategoryId !== 'ALL' || filterSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterFromDate('');
                      setFilterToDate('');
                      setFilterCategoryId('ALL');
                      setFilterSearch('');
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 font-bold"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[var(--text-muted)]">Số phiếu: </span>
                  <strong className="font-black">{summary.count} phiếu</strong>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                  <span className="text-amber-800 dark:text-amber-300 font-semibold">
                    Tổng Thực Chi:{' '}
                  </span>
                  <strong className="font-black text-sm text-amber-700 dark:text-amber-300">
                    {(summary.totalAdjusted || 0).toLocaleString('vi-VN')} VNĐ
                  </strong>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Đang tải lịch sử nhập kho...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Chưa có phiếu nhập kho nào trong khoảng thời gian / bộ lọc này
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                    <tr>
                      <th className="py-3 px-3.5">Mã Phiếu</th>
                      <th className="py-3 px-3.5">Ngày Nhập</th>
                      <th className="py-3 px-3.5">Sản Phẩm Kho</th>
                      <th className="py-3 px-3.5">Danh Mục</th>
                      <th className="py-3 px-3.5 text-center">SL &amp; ĐVT</th>
                      <th className="py-3 px-3.5">Đơn Giá</th>
                      <th className="py-3 px-3.5">Tạm Tính</th>
                      <th className="py-3 px-3.5">Thực Chi (Điều Chỉnh)</th>
                      <th className="py-3 px-3.5">Ghi Chú</th>
                      <th className="py-3 px-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {entries.map((en) => {
                      const isDiff = en.adjustedAmount !== en.calculatedAmount;
                      return (
                        <tr key={en.id} className="hover:bg-[var(--bg-subtle)] transition">
                          <td className="py-3.5 px-3.5 font-mono font-bold text-matcha-700 dark:text-matcha-300 whitespace-nowrap">
                            {en.entryCode}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {new Date(en.entryDate).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-3.5 font-extrabold text-sm text-[var(--text-main)]">
                            {en.itemName}
                          </td>
                          <td className="py-3.5 px-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300">
                              {en.categoryName}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-center font-bold whitespace-nowrap">
                            {en.quantity} {en.unit}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {(en.unitPrice || 0).toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3.5 px-3.5 text-[var(--text-muted)] whitespace-nowrap">
                            {(en.calculatedAmount || 0).toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3.5 px-3.5 font-black text-amber-700 dark:text-amber-300 whitespace-nowrap">
                            {(en.adjustedAmount || 0).toLocaleString('vi-VN')} đ
                            {isDiff && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] font-bold">
                                Đã ĐC
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-[var(--text-muted)] max-w-xs truncate">
                            {en.note || '—'}
                          </td>
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditEntry(en)}
                                className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)]"
                                title="Sửa phiếu nhập"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(en)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                                title="Xóa phiếu nhập"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

