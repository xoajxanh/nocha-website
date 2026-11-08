'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import InventorySubNav from '@/components/InventorySubNav';
import { Boxes, Plus, Edit3, Trash2, X, Search } from 'lucide-react';

const UNIT_SUGGESTIONS = [
  'cái',
  'chiếc',
  'hộp',
  'bọc',
  'gói',
  'kg',
  'gram',
  'lít',
  'ml',
  'chai',
  'túi',
  'thùng',
  'lần',
  'tháng',
];

export default function InventoryItemsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filterCatId, setFilterCatId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('cái');
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [itemRes, catRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/inventory/categories'),
      ]);
      const itemData = await itemRes.json();
      const catData = await catRes.json();

      if (itemData.items) setItems(itemData.items);
      if (catData.categories) {
        setCategories(catData.categories);
        if (catData.categories.length > 0 && !categoryId) {
          setCategoryId(catData.categories[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          loadAll();
        }
      });
  }, [router]);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    // Nếu đang lọc theo 1 danh mục (tab active) thì mặc định chọn luôn danh mục đó
    const activeCat =
      filterCatId !== 'ALL' && categories.some((c) => c.id === filterCatId) ? filterCatId : '';
    setCategoryId(activeCat || categories[0]?.id || '');
    setUnit('gói');
    setReferencePrice(0);
    setNote('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (it: any) => {
    setEditingItem(it);
    setName(it.name || '');
    setCategoryId(it.categoryId || categories[0]?.id || '');
    setUnit(it.unit || 'cái');
    setReferencePrice(Number(it.referencePrice) || 0);
    setNote(it.note || '');
    setIsActive(it.isActive !== false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingItem
        ? `/api/inventory/items/${editingItem.id}`
        : '/api/inventory/items';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryId,
          unit,
          referencePrice,
          note,
          isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể lưu sản phẩm kho');
      }

      setToast({
        message: editingItem ? 'Đã cập nhật sản phẩm kho!' : 'Đã thêm sản phẩm kho mới!',
        type: 'success',
      });
      setShowModal(false);
      loadAll();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (it: any) => {
    if (!confirm(`Xác nhận xóa mặt hàng kho [${it.name}]?`)) return;
    try {
      const res = await fetch(`/api/inventory/items/${it.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast({ message: `Đã xóa ${it.name}`, type: 'success' });
        loadAll();
      }
    } catch {
      setToast({ message: 'Không thể xóa mặt hàng kho', type: 'error' });
    }
  };

  const filteredItems = items.filter((it) => {
    const matchCat = filterCatId === 'ALL' || it.categoryId === filterCatId;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      (it.name || '').toLowerCase().includes(q) ||
      (it.categoryName || '').toLowerCase().includes(q) ||
      (it.unit || '').toLowerCase().includes(q) ||
      (it.note || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

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
                <Boxes className="w-6 h-6 text-matcha-600" />
                Quản Lý Sản Phẩm Kho (Nguyên Liệu / Đồ Dùng / Thiết Bị / Dịch Vụ)
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Khai báo tên mặt hàng đầu vào, danh mục, đơn vị tính (cái, chiếc, hộp, bọc, kg, lít, ml...) và giá nhập tham khảo
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>THÊM SẢN PHẨM KHO</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="nocha-card p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setFilterCatId('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterCatId === 'ALL'
                    ? 'matcha-gradient-btn text-white shadow-sm'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}
              >
                Tất cả ({items.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCatId(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    filterCatId === c.id
                      ? 'matcha-gradient-btn text-white shadow-sm'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên nguyên liệu, đồ dùng, dịch vụ..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-semibold focus:outline-none focus:border-matcha-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="nocha-card p-5 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Đang tải danh sách sản phẩm kho...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Không có mặt hàng kho nào phù hợp
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Tên Sản Phẩm / Dịch Vụ Kho</th>
                      <th className="py-3.5 px-4">Danh Mục</th>
                      <th className="py-3.5 px-4 text-center">Đơn Vị Tính</th>
                      <th className="py-3.5 px-4">Giá Nhập Tham Khảo</th>
                      <th className="py-3.5 px-4">Ghi Chú</th>
                      <th className="py-3.5 px-4 text-center">Số Lần Nhập</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredItems.map((it) => (
                      <tr key={it.id} className="hover:bg-[var(--bg-subtle)] transition">
                        <td className="py-3.5 px-4 font-extrabold text-sm text-matcha-900 dark:text-matcha-100">
                          {it.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300">
                            {it.categoryName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold">
                            {it.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-matcha-700 dark:text-matcha-300">
                          {(it.referencePrice || 0).toLocaleString('vi-VN')} đ / {it.unit}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)] max-w-xs truncate">
                          {it.note || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {it.entryCount || 0} lần
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(it)}
                              className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)]"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(it)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                              title="Xóa sản phẩm kho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="nocha-card w-full max-w-lg p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100">
                  {editingItem ? 'Chỉnh Sửa Sản Phẩm Kho' : 'Thêm Sản Phẩm / Dịch Vụ Kho Mới'}
                </h3>

                <form onSubmit={handleSave} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">
                      Tên Sản Phẩm / Nguyên Liệu / Dịch Vụ *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập tên nguyên liệu, đồ dùng, máy móc hoặc dịch vụ..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold mb-1">Danh Mục Kho *</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                        required
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Giá Nhập Tham Khảo (VNĐ) *</label>
                      <input
                        type="number"
                        min={0}
                        value={referencePrice}
                        onChange={(e) =>
                          setReferencePrice(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-black text-matcha-700 dark:text-matcha-300"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Đơn Vị Tính * (Gõ trực tiếp hoặc bấm chọn nhanh bên dưới)
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="cái, chiếc, hộp, bọc, kg, lít, ml..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      required
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {UNIT_SUGGESTIONS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            unit === u
                              ? 'matcha-gradient-btn text-white border-transparent'
                              : 'bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Ghi Chú / Quy Cách</label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Quy cách đóng gói, nhà cung cấp hoặc mô tả chi tiết..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md"
                  >
                    {submitting
                      ? 'Đang lưu...'
                      : editingItem
                      ? 'LƯU CẬP NHẬT SẢN PHẨM KHO'
                      : 'THÊM SẢN PHẨM KHO'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

