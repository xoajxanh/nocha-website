'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { User, KeyRound, Save } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
          setDisplayName(data.user.displayName || '');
          setPhone(data.user.phone || '');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          phone,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể cập nhật');
      setUser((prev: any) => ({ ...prev, displayName, phone }));
      setCurrentPassword('');
      setNewPassword('');
      setToast({ message: 'Đã cập nhật thông tin cá nhân thành công!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Lỗi hệ thống', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <User className="w-6 h-6 text-matcha-600" />
                Thông Tin Cá Nhân &amp; Đổi Mật Khẩu
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Quản lý tên hiển thị, số điện thoại và bảo mật tài khoản của bạn
              </p>
            </div>

            <form onSubmit={handleSave} className="nocha-card p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Tên Đăng Nhập</label>
                <input
                  type="text"
                  value={`@${user.username}`}
                  disabled
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-mono font-bold opacity-70"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Tên Hiển Thị *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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

              <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                <div className="font-black text-sm flex items-center gap-1.5 text-matcha-800 dark:text-matcha-300">
                  <KeyRound className="w-4 h-4" />
                  <span>Đổi Mật Khẩu (Bỏ trống nếu không đổi)</span>
                </div>

                <div>
                  <label className="block font-bold mb-1">Mật Khẩu Hiện Tại</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Mật Khẩu Mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}</span>
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

