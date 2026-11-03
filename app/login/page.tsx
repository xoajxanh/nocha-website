'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, Lock, User, ArrowLeft, LogIn } from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeProvider';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Lỗi kết nối máy chủ');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative">
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl nocha-card text-xs font-bold text-matcha-800 dark:text-matcha-300 hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Trang Menu</span>
        </Link>
        <ThemeToggleButton />
      </div>

      <div className="nocha-card w-full max-w-md p-6 sm:p-8 space-y-6 shadow-xl border-2 border-matcha-200 dark:border-matcha-800">
        <div className="text-center space-y-2">
          <img
            src="/images/logo.png"
            alt="Matcha NOCHA Logo"
            className="w-20 h-20 rounded-full object-contain mx-auto shadow-md"
          />
          <h1 className="text-2xl font-black text-matcha-900 dark:text-matcha-200 tracking-wide">
            NOCHA POS &amp; ADMIN
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Đăng nhập hệ thống quản lý đơn hàng &amp; thống kê doanh thu
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-matcha-900 dark:text-matcha-200">
              Tên Đăng Nhập
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tài khoản đăng nhập"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-sm font-medium focus:outline-none focus:border-matcha-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-matcha-900 dark:text-matcha-200">
              Mật Khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-sm font-medium focus:outline-none focus:border-matcha-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl matcha-gradient-btn font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-[var(--border-color)] text-center text-[11px] text-[var(--text-muted)]">
          NOCHA Matcha &amp; Coffee • Tòa S2 Goldmark City • 0989600992
        </div>
      </div>
    </div>
  );
}

