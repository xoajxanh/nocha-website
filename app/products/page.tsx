'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import {
  Coffee,
  Plus,
  Edit3,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  XCircle,
  Sliders,
} from 'lucide-react';

interface SizeOption {
  name: string;
  price: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filterCatId, setFilterCatId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProd, setEditingProd] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState<number>(35000);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/products/matcha-latte.jpg');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);

  // Option definitions: Sizes (S, M, L), % Sugar, % Ice
  const [sizes, setSizes] = useState<SizeOption[]>([
    { name: 'S (350ml)', price: -5000 },
    { name: 'M (500ml)', price: 0 },
    { name: 'L (700ml)', price: 7000 },
  ]);
  const [sugarInput, setSugarInput] = useState('0%, 30%, 50%, 70%, 100%');
  const [iceInput, setIceInput] = useState('0% (Không đá), 30% đá, 50% đá, 70% đá, 100% đá, Đá riêng');

  const [uploadingImg, setUploadingImg] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
          if (data.user.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
          }
          setUser(data.user);
          loadAll();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products'),
      ]);
      if (catRes.ok) {
        const cj = await catRes.json();
        setCategories(cj.categories || []);
      }
      if (prodRes.ok) {
        const pj = await prodRes.json();
        setProducts(pj.products || []);
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

  const openCreateModal = () => {
    setEditingProd(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setBasePrice(35000);
    setDescription('');
    setImageUrl('/images/products/matcha-latte-caramel.jpg');
    setIsActive(true);
    setSortOrder(products.length + 1);
    setSizes([
      { name: 'S (350ml)', price: -5000 },
      { name: 'M (500ml)', price: 0 },
      { name: 'L (700ml)', price: 7000 },
    ]);
    setSugarInput('0%, 30%, 50%, 70%, 100%');
    setIceInput('0% (Không đá), 30% đá, 50% đá, 70% đá, 100% đá, Đá riêng');
    setShowModal(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProd(prod);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setBasePrice(prod.basePrice || 0);
    setDescription(prod.description || '');
    setImageUrl(prod.imageUrl || '/images/products/matcha-latte.jpg');
    setIsActive(prod.isActive);
    setSortOrder(prod.sortOrder || 0);

    const parsedSizes = parseJsonSafe(prod.sizesJson, [{ name: 'M (500ml)', price: 0 }]);
    const parsedSugars = parseJsonSafe(prod.sugarOptionsJson, ['0%', '30%', '50%', '70%', '100%']);
    const parsedIces = parseJsonSafe(prod.iceOptionsJson, ['0%', '30%', '50%', '70%', '100%', 'Đá riêng']);

    setSizes(parsedSizes);
    setSugarInput(Array.isArray(parsedSugars) ? parsedSugars.join(', ') : '');
    setIceInput(Array.isArray(parsedIces) ? parsedIces.join(', ') : '');
    setShowModal(true);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi tải ảnh');
      setImageUrl(json.url);
      setToast({ message: 'Tải ảnh đại diện thành công!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Không thể tải ảnh lên', type: 'error' });
    } finally {
      setUploadingImg(false);
    }
  };

  const addSizeRow = () => {
    setSizes((prev) => [...prev, { name: 'XL', price: 10000 }]);
  };

  const updateSizeRow = (idx: number, patch: Partial<SizeOption>) => {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSizeRow = (idx: number) => {
    if (sizes.length <= 1) return;
    setSizes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      setToast({ message: 'Vui lòng nhập tên sản phẩm và chọn danh mục', type: 'error' });
      return;
    }

    const sugarOptions = sugarInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const iceOptions = iceInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const url = editingProd ? `/api/products/${editingProd.id}` : '/api/products';
      const method = editingProd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryId,
          basePrice: Number(basePrice) || 0,
          description,
          imageUrl,
          sizes,
          sugarOptions,
          iceOptions,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu sản phẩm');

      setToast({
        message: editingProd ? 'Đã cập nhật sản phẩm!' : 'Đã thêm sản phẩm mới!',
        type: 'success',
      });
      setShowModal(false);
      loadAll();
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi hệ thống', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm [${prod.name}]?`)) return;

    try {
      const res = await fetch(`/api/products/${prod.id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: `Đã xóa ${prod.name}`, type: 'success' });
        loadAll();
      }
    } catch {
      setToast({ message: 'Không thể xóa sản phẩm', type: 'error' });
    }
  };

  const filteredProducts =
    filterCatId === 'ALL'
      ? products
      : products.filter((p) => p.categoryId === filterCatId);

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

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <Coffee className="w-6 h-6 text-matcha-600" />
                Quản Lý Sản Phẩm &amp; Cấu Hình Option
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Thêm món, giá bán, ảnh đại diện và định nghĩa các lựa chọn Size (S/M/L), % Đường, % Đá
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>THÊM SẢN PHẨM MỚI</span>
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCatId('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterCatId === 'ALL'
                  ? 'matcha-gradient-btn text-white'
                  : 'nocha-card text-[var(--text-muted)]'
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCatId(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterCatId === c.id
                    ? 'matcha-gradient-btn text-white'
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
              Đang tải danh sách sản phẩm...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredProducts.map((prod) => {
                const prodSizes = parseJsonSafe(prod.sizesJson, []);
                const prodSugars = parseJsonSafe(prod.sugarOptionsJson, []);
                const prodIces = parseJsonSafe(prod.iceOptionsJson, []);

                return (
                  <div
                    key={prod.id}
                    className="nocha-card overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-48 bg-[#fbf8f1] dark:bg-[#17261b] relative overflow-hidden flex items-center justify-center p-4">
                        <img
                          src={prod.imageUrl || '/images/products/matcha-latte.jpg'}
                          alt={prod.name}
                          className="max-h-full max-w-[75%] w-auto h-auto object-contain rounded-xl group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-matcha-800/90 text-white">
                          {prod.category?.name}
                        </span>
                        <span
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            prod.isActive
                              ? 'bg-emerald-600/90 text-white'
                              : 'bg-slate-700/90 text-slate-200'
                          }`}
                        >
                          {prod.isActive ? 'Đang bán' : 'Tạm ngưng'}
                        </span>
                      </div>

                      <div className="p-4 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-matcha-900 dark:text-matcha-100">
                            {prod.name}
                          </h3>
                          <span className="font-black text-sm sm:text-base text-matcha-700 dark:text-matcha-400 whitespace-nowrap">
                            {(prod.basePrice || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>

                        <div className="space-y-1 pt-1 text-[11px] text-[var(--text-muted)]">
                          <div>
                            <strong>Size:</strong>{' '}
                            {prodSizes.map((s: any) => s.name).join(', ')}
                          </div>
                          <div>
                            <strong>% Đường:</strong> {prodSugars.join(', ')}
                          </div>
                          <div>
                            <strong>% Đá:</strong> {prodIces.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="flex-1 py-2 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 font-bold text-xs flex items-center justify-center gap-1.5 text-matcha-800 dark:text-matcha-200 border border-[var(--border-color)]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa &amp; Option</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create / Edit Product Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="nocha-card w-full max-w-2xl p-6 space-y-5 relative max-h-[92vh] overflow-y-auto">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-black text-base sm:text-lg text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-matcha-600" />
                  {editingProd ? `Chỉnh Sửa: ${editingProd.name}` : 'Thêm Sản Phẩm Mới'}
                </h3>

                <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-1">Tên Sản Phẩm *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="VD: Matcha Latte Caramel"
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Danh Mục *</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold mb-1">Giá Bán Chuẩn (VNĐ) *</label>
                      <input
                        type="number"
                        value={basePrice}
                        onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-black text-matcha-700 dark:text-matcha-300"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Thứ Tự Sắp Xếp</label>
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
                        <span>Đang mở bán</span>
                      </label>
                    </div>
                  </div>

                  {/* Image Upload / Preset Selector */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3">
                    <label className="block font-bold">Hình Ảnh Đại Diện Sản Phẩm</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <img
                        src={imageUrl || '/images/products/matcha-latte.jpg'}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="/images/products/..."
                            className="flex-1 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]"
                          />
                          <label className="px-3.5 py-2 rounded-xl bg-matcha-700 hover:bg-matcha-600 text-white font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingImg ? 'Đang tải...' : 'Upload Ảnh'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadFile}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Quick select built-in NOCHA images */}
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Matcha Caramel', url: '/images/products/matcha-latte-caramel.jpg' },
                            { label: 'Coco Matcha', url: '/images/products/coco-matcha.jpg' },
                            { label: 'Matcha Latte', url: '/images/products/matcha-latte.jpg' },
                            { label: 'Cold Whisk', url: '/images/products/matcha-cold-whisk.jpg' },
                          ].map((preset) => (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => setImageUrl(preset.url)}
                              className="px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-bold hover:border-matcha-500"
                            >
                              Ảnh: {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Mô Tả Hương Vị</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả thành phần, hương vị..."
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                    />
                  </div>

                  {/* Option 1: Sizes S, M, L & Price Adjustment */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-matcha-800 dark:text-matcha-300">
                        Định Nghĩa Các Size (S, M, L...) &amp; Chênh Lệch Giá (VNĐ)
                      </label>
                      <button
                        type="button"
                        onClick={addSizeRow}
                        className="px-2.5 py-1 rounded-lg bg-matcha-700 text-white text-[11px] font-bold"
                      >
                        + Thêm Size
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sizes.map((sz, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={sz.name}
                            onChange={(e) => updateSizeRow(idx, { name: e.target.value })}
                            placeholder="Tên Size (VD: Size M)"
                            className="flex-1 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[var(--text-muted)]">Chênh giá:</span>
                            <input
                              type="number"
                              value={sz.price}
                              onChange={(e) =>
                                updateSizeRow(idx, { price: Number(e.target.value) || 0 })
                              }
                              className="w-28 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
                            />
                          </div>
                          {sizes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSizeRow(idx)}
                              className="p-2 rounded-xl bg-rose-500/10 text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Option 2 & 3: % Đường & % Đá */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">
                        Các Mức % Đường (Ngăn cách bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={sugarInput}
                        onChange={(e) => setSugarInput(e.target.value)}
                        placeholder="0%, 30%, 50%, 70%, 100%"
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">
                        Các Mức % Đá (Ngăn cách bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={iceInput}
                        onChange={(e) => setIceInput(e.target.value)}
                        placeholder="0%, 30%, 50%, 70%, 100%, Đá riêng"
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md"
                  >
                    {submitting
                      ? 'Đang lưu...'
                      : editingProd
                      ? 'LƯU CẬP NHẬT SẢN PHẨM'
                      : 'THÊM SẢN PHẨM MỚI'}
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

