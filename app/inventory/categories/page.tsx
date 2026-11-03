'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import InventorySubNav from '@/components/InventorySubNav';
import { Layers, Plus, Edit3, Trash2, X } from 'lucide-react';

export default function InventoryCategoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
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
          loadCategories();
        }
      });
  }, [router]);

  const openCreateModal = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCat(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setSortOrder(cat.sortOrder || 0);
    setIsActive(cat.isActive !== false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingCat
        ? `/api/inventory/categories/${editingCat.id}`
        : '/api/inventory/categories';
      const method = editingCat ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, sortOrder, isActive }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Không thể lưu danh mục kho');
      }

      setToast({
        message: editingCat ? 'Đã cập nhật danh mục kho!' : 'Đã thêm danh mục kho mới!',
        type: 'success',
      });
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!confirm(`Xác nhận xóa danh mục kho [${cat.name}]?`)) return;
    try {
      const res = await fetch(`/api/inventory/categories/${cat.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToast({ message: `Đã xóa danh mục ${cat.name}`, type: 'success' });
        loadCategories();
      } else {
        setToast({ message: 'Không thể xóa danh mục', type: 'error' });
      }
    } catch {
      setToast({ message: 'Lỗi khi xóa danh mục', type: 'error' });
    }
  };

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
                <Layers className="w-6 h-6 text-matcha-600" />
                Quản Lý Danh Mục Kho Đầu Vào
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Phân loại nhóm chi phí đầu vào: Nguyên liệu, Đồ dùng, Dịch vụ (sửa chữa, phát sinh), Thiết bị...
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>THÊM DANH MỤC KHO</span>
            </button>
          </div>

          <div className="nocha-card p-5 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Đang tải danh mục kho...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Thứ Tự</th>
                      <th className="py-3.5 px-4">Tên Danh Mục Kho</th>
                      <th className="py-3.5 px-4">Mô Tả</th>
                      <th className="py-3.5 px-4 text-center">Số Sản Phẩm Kho</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[var(--bg-subtle)]/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold">{cat.sortOrder}</td>
                        <td className="py-3.5 px-4 font-extrabold text-sm text-matcha-900 dark:text-matcha-100">
                          {cat.name}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)] max-w-md">
                          {cat.description || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-matcha-700 dark:text-matcha-300">
                          {cat.itemCount || 0} mặt hàng
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.isActive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-500/15 text-slate-500'
                            }`}
                          >
                            {cat.isActive ? 'Đang dùng' : 'Đã ẩn'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(cat)}
                              className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)]"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat)}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                              title="Xóa danh mục"
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
              <div className="nocha-card w-full max-w-md p-6 space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100">
                  {editingCat ? 'Chỉnh Sửa Danh Mục Kho' : 'Thêm Danh Mục Kho Mới'}
                </h3>

                <form onSubmit={handleSave} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Tên Danh Mục Kho *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyên liệu, Đồ dùng, Dịch vụ, Thiết bị..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Mô Tả</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả nhóm hàng hóa / chi phí..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Thứ Tự Hiển Thị</label>
                      <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4 h-4 accent-matcha-600 rounded"
                        />
                        <span>Đang sử dụng</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl matcha-gradient-btn font-bold text-xs shadow-md"
                  >
                    {submitting
                      ? 'Đang lưu...'
                      : editingCat
                      ? 'CẬP NHẬT DANH MỤC KHO'
                      : 'TẠO DANH MỤC KHO'}
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

