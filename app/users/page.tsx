'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import {
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((resData) => {
        if (resData?.user) {
          if (resData.user.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
          }
          setCurrentUser(resData.user);
          loadUsers();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setUsersList(json.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setDisplayName('');
    setPhone('');
    setRole('STAFF');
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword('');
    setDisplayName(u.displayName);
    setPhone(u.phone || '');
    setRole(u.role);
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            phone,
            role,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không thể cập nhật');
        setToast({ message: 'Đã cập nhật thông tin nhân viên!', type: 'success' });
      } else {
        if (!username.trim() || !password.trim() || !displayName.trim()) {
          throw new Error('Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Tên hiển thị');
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            displayName,
            phone,
            role,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không thể tạo nhân viên');
        setToast({ message: 'Tạo tài khoản nhân viên thành công!', type: 'success' });
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi hệ thống', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (u: any) => {
    const nextLock = !u.isLocked;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLock }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ message: json.error || 'Không thể khóa/mở khóa', type: 'error' });
        return;
      }
      setToast({
        message: nextLock
          ? `Đã KHÓA tài khoản [${u.displayName}]`
          : `Đã MỞ KHÓA tài khoản [${u.displayName}]`,
        type: 'success',
      });
      loadUsers();
    } catch {
      setToast({ message: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || newResetPassword.trim().length < 4) {
      setToast({ message: 'Mật khẩu mới phải từ 4 ký tự trở lên', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: newResetPassword.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể reset mật khẩu');
      setToast({
        message: `Đã đặt lại mật khẩu mới cho [${resetTarget.displayName}]!`,
        type: 'success',
      });
      setResetTarget(null);
      setNewResetPassword('');
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi hệ thống', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản [${u.displayName} (@${u.username})]?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setToast({ message: json.error || 'Không thể xóa', type: 'error' });
        return;
      }
      setToast({ message: `Đã xóa tài khoản ${u.displayName}`, type: 'success' });
      loadUsers();
    } catch {
      setToast({ message: 'Lỗi khi xóa tài khoản', type: 'error' });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={currentUser.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={currentUser} />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto space-y-6">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <Users className="w-6 h-6 text-matcha-600" />
                Quản Trị Tài Khoản Nhân Viên
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Thêm, sửa thông tin, khóa/mở khóa tài khoản, reset mật khẩu và xóa nhân viên
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>THÊM NHÂN VIÊN MỚI</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="nocha-card p-5 sm:p-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Đang tải danh sách nhân viên...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Tên Hiển Thị</th>
                      <th className="py-3.5 px-4">Tài Khoản</th>
                      <th className="py-3.5 px-4">Số Điện Thoại</th>
                      <th className="py-3.5 px-4">Vai Trò</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4 text-center">Tổng Đơn</th>
                      <th className="py-3.5 px-4">Doanh Thu Đã Tạo</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác Quản Trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-subtle)]/50 transition">
                        <td className="py-3.5 px-4 font-bold flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-matcha-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.displayName}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-matcha-700 dark:text-matcha-300">
                          @{u.username}
                        </td>
                        <td className="py-3.5 px-4">{u.phone || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-matcha-500/15 text-matcha-800 dark:text-matcha-300'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {u.role === 'ADMIN' ? 'ADMIN' : 'NHÂN VIÊN'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.isLocked ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600">
                              🔒 Đang khóa
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {u.totalOrders || 0} đơn
                        </td>
                        <td className="py-3.5 px-4 font-black text-matcha-700 dark:text-matcha-300">
                          {(u.totalRevenue || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Sửa */}
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)] font-bold flex items-center gap-1"
                              title="Sửa thông tin"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetTarget(u);
                                setNewResetPassword('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1"
                              title="Reset mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Reset MK</span>
                            </button>

                            {/* Khóa / Mở khóa */}
                            {u.id !== currentUser.userId && (
                              <button
                                onClick={() => handleToggleLock(u)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
                                  u.isLocked
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                                }`}
                                title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                {u.isLocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Mở khóa</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Khóa</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Xóa */}
                            {u.id !== currentUser.userId && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Create / Edit User */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="nocha-card w-full max-w-md p-6 space-y-4 relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100">
                  {editingUser
                    ? `Sửa Nhân Viên: ${editingUser.displayName}`
                    : 'Thêm Tài Khoản Nhân Viên Mới'}
                </h3>

                <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Tên Đăng Nhập *</label>
                    <input
                      type="text"
                      value={username}
                      disabled={Boolean(editingUser)}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="VD: nv3"
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold disabled:opacity-60"
                      required
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="block font-bold mb-1">Mật Khẩu Khởi Tạo *</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold mb-1">Tên Hiển Thị *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="VD: Nhân viên Pha chế 3"
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Số Điện Thoại</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0989600992"
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Phân Quyền (Role)</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'ADMIN' | 'STAFF')}
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                    >
                      <option value="STAFF">
                        NHÂN VIÊN (Tạo đơn, Pha chế, Xem Dashboard cá nhân)
                      </option>
                      <option value="ADMIN">
                        ADMIN (Toàn quyền quản trị Menu, Nhân viên &amp; Dashboard)
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl matcha-gradient-btn font-bold text-xs shadow-md"
                  >
                    {submitting
                      ? 'Đang lưu...'
                      : editingUser
                      ? 'LƯU CẬP NHẬT'
                      : 'TẠO TÀI KHOẢN NHÂN VIÊN'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal Reset Password */}
          {resetTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="nocha-card w-full max-w-sm p-6 space-y-4 relative">
                <button
                  onClick={() => setResetTarget(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  Reset Mật Khẩu Nhân Viên
                </h3>

                <p className="text-xs text-[var(--text-muted)]">
                  Đặt mật khẩu mới cho tài khoản{' '}
                  <strong>
                    {resetTarget.displayName} (@{resetTarget.username})
                  </strong>
                  :
                </p>

                <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Mật Khẩu Mới *</label>
                    <input
                      type="text"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (VD: 123456)"
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl matcha-gradient-btn font-bold text-xs shadow-md"
                  >
                    {submitting ? 'Đang đặt lại...' : 'XÁC NHẬN ĐẶT LẠI MẬT KHẨU'}
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

