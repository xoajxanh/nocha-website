'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  PlusCircle,
  Users,
  Calendar,
  Award,
  BarChart3,
  ChevronRight,
  Leaf,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
} from 'lucide-react';

function getMonthDateRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    year: y,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const defaultDates = getMonthDateRange();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Global Admin quick-sync staff selector
  const [globalStaffId, setGlobalStaffId] = useState('ALL');

  // Card 1: Revenue Filter State
  const [revFrom, setRevFrom] = useState(defaultDates.start);
  const [revTo, setRevTo] = useState(defaultDates.end);
  const [revStaffId, setRevStaffId] = useState('ALL');

  // Card 2: Orders Filter State
  const [ordFrom, setOrdFrom] = useState(defaultDates.start);
  const [ordTo, setOrdTo] = useState(defaultDates.end);
  const [ordStaffId, setOrdStaffId] = useState('ALL');

  // Monthly Chart Filter State
  const [chartYear, setChartYear] = useState(defaultDates.year);
  const [chartStaffId, setChartStaffId] = useState('ALL');

  // Bottom 2 Product Charts Filter State
  const [prodFrom, setProdFrom] = useState(defaultDates.start);
  const [prodTo, setProdTo] = useState(defaultDates.end);
  const [prodStaffId, setProdStaffId] = useState('ALL');

  const fetchDashboard = useCallback(
    async (paramsObj: {
      revFrom: string;
      revTo: string;
      revStaffId: string;
      ordFrom: string;
      ordTo: string;
      ordStaffId: string;
      chartYear: number;
      chartStaffId: string;
      prodFrom: string;
      prodTo: string;
      prodStaffId: string;
    }) => {
      try {
        const qs = new URLSearchParams({
          revFrom: paramsObj.revFrom,
          revTo: paramsObj.revTo,
          revStaffId: paramsObj.revStaffId,
          ordFrom: paramsObj.ordFrom,
          ordTo: paramsObj.ordTo,
          ordStaffId: paramsObj.ordStaffId,
          year: String(paramsObj.chartYear),
          chartStaffId: paramsObj.chartStaffId,
          prodFrom: paramsObj.prodFrom,
          prodTo: paramsObj.prodTo,
          prodStaffId: paramsObj.prodStaffId,
        });
        const res = await fetch(`/api/dashboard?${qs.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Load dashboard error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
          setUser(resData.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetchDashboard({
      revFrom,
      revTo,
      revStaffId,
      ordFrom,
      ordTo,
      ordStaffId,
      chartYear,
      chartStaffId,
      prodFrom,
      prodTo,
      prodStaffId,
    });
  }, [
    user,
    revFrom,
    revTo,
    revStaffId,
    ordFrom,
    ordTo,
    ordStaffId,
    chartYear,
    chartStaffId,
    prodFrom,
    prodTo,
    prodStaffId,
    fetchDashboard,
  ]);

  const handleGlobalStaffChange = (staffId: string) => {
    setGlobalStaffId(staffId);
    setRevStaffId(staffId);
    setOrdStaffId(staffId);
    setChartStaffId(staffId);
    setProdStaffId(staffId);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-matcha-500/20 border-t-matcha-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-[var(--text-muted)]">
            Đang tải dữ liệu NOCHA Dashboard...
          </span>
        </div>
      </div>
    );
  }

  const staffList: any[] = data?.staffList || [];
  const revenueCard = data?.revenueCard || {
    periodRevenue: 0,
    totalSystemRevenue: 0,
    allSystemTotalRevenue: 0,
    completedOrderCount: 0,
  };
  const orderCard = data?.orderCard || {
    periodOrderCount: 0,
    periodCompletedOrders: 0,
    periodShippingOrders: 0,
    periodCreatedOrders: 0,
    periodCancelledOrders: 0,
    totalSystemOrders: 0,
    allSystemTotalOrders: 0,
  };

  const monthlyChartData: any[] = data?.monthlyChartData || [];
  const maxMonthRev = Math.max(...monthlyChartData.map((d) => d.revenue || 0), 100000);
  const maxMonthOrders = Math.max(...monthlyChartData.map((d) => d.orders || 0), 5);

  const chartWidth = 1200;
  const chartHeight = 220;
  const points = monthlyChartData.map((item, i) => {
    const x = (i + 0.5) * (chartWidth / 12);
    const y = 185 - ((item.orders || 0) / maxMonthOrders) * 145;
    return { x, y, orders: item.orders, revenue: item.revenue, month: item.month };
  });

  const linePathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPathD =
    points.length > 0
      ? `${linePathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`
      : '';

  const topProductsByQty: any[] = data?.topProductsByQuantity || [];
  const topProductsByRev: any[] = data?.topProductsByRevenue || [];
  const maxProdQty = Math.max(...topProductsByQty.map((p) => p.totalQuantity || 0), 1);
  const maxProdRev = Math.max(...topProductsByRev.map((p) => p.totalRevenue || 0), 10000);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Top Action & Global Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-matcha-600" />
                {user.role === 'ADMIN'
                  ? 'Dashboard Quản Trị Doanh Thu NOCHA'
                  : `Dashboard Cá Nhân — ${user.displayName}`}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {user.role === 'ADMIN'
                  ? 'Thống kê doanh thu thuần (không tính phí ship), lượng đơn và sản phẩm bán chạy toàn hệ thống hoặc theo từng nhân viên'
                  : 'Thống kê doanh thu thuần (không tính phí ship), số đơn hàng và sản phẩm bán chạy do bạn tạo'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {user.role === 'ADMIN' && staffList.length > 0 && (
                <div className="flex items-center gap-2 nocha-card px-3.5 py-2">
                  <Users className="w-4 h-4 text-matcha-600 shrink-0" />
                  <span className="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">
                    Đồng bộ Nhân viên:
                  </span>
                  <select
                    value={globalStaffId}
                    onChange={(e) => handleGlobalStaffChange(e.target.value)}
                    className="bg-[var(--bg-subtle)] text-[var(--text-main)] text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-color)] focus:outline-none focus:border-matcha-600 cursor-pointer"
                  >
                    <option value="ALL">Tất cả nhân viên</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} (@{s.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                href="/orders/create"
                className="px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>TẠO ĐƠN MỚI</span>
              </Link>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 1: 2 KPI CARDS (DOANH THU & SỐ LƯỢNG ĐƠN) VỚI BỘ LỌC RIÊNG    */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: THỐNG KÊ DOANH THU */}
            <div className="nocha-card p-5 sm:p-6 space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2 text-matcha-700 dark:text-matcha-300 font-extrabold text-sm uppercase tracking-wider">
                  <div className="w-8 h-8 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 flex items-center justify-center text-matcha-700 dark:text-matcha-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span>Thống Kê Doanh Thu (Không Gồm Ship)</span>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300 w-fit">
                  Đơn hoàn thành: {revenueCard.completedOrderCount} đơn
                </span>
              </div>

              {/* Filter Bar inside Card 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-color)] text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={revFrom}
                    onChange={(e) => setRevFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={revTo}
                    onChange={(e) => setRevTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Nhân viên tạo đơn
                  </label>
                  {user.role === 'ADMIN' ? (
                    <select
                      value={revStaffId}
                      onChange={(e) => setRevStaffId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                    >
                      <option value="ALL">Tất cả nhân viên</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-matcha-700 dark:text-matcha-300 truncate">
                      {user.displayName}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Metric & System Total */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)]">
                    Doanh thu trong kỳ đã chọn:
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-matcha-800 dark:text-matcha-300 mt-1">
                    {(revenueCard.periodRevenue || 0).toLocaleString('vi-VN')}{' '}
                    <span className="text-sm font-bold text-[var(--text-muted)]">VNĐ</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-matcha-600" />
                    <span>Tổng doanh thu hệ thống:</span>
                  </div>
                  <div className="text-base font-black text-matcha-900 dark:text-matcha-200 mt-0.5">
                    {(revenueCard.totalSystemRevenue || 0).toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: THỐNG KÊ SỐ LƯỢNG ĐƠN */}
            <div className="nocha-card p-5 sm:p-6 space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2 text-matcha-700 dark:text-matcha-300 font-extrabold text-sm uppercase tracking-wider">
                  <div className="w-8 h-8 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 flex items-center justify-center text-matcha-700 dark:text-matcha-300">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>Thống Kê Số Lượng Đơn Hàng</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Hoàn thành: {orderCard.periodCompletedOrders}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                    Đang giao: {orderCard.periodShippingOrders}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Chờ đi: {orderCard.periodCreatedOrders}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    Đã hủy: {orderCard.periodCancelledOrders}
                  </span>
                </div>
              </div>

              {/* Filter Bar inside Card 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-color)] text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={ordFrom}
                    onChange={(e) => setOrdFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={ordTo}
                    onChange={(e) => setOrdTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Nhân viên tạo đơn
                  </label>
                  {user.role === 'ADMIN' ? (
                    <select
                      value={ordStaffId}
                      onChange={(e) => setOrdStaffId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                    >
                      <option value="ALL">Tất cả nhân viên</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-matcha-700 dark:text-matcha-300 truncate">
                      {user.displayName}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Metric & System Total */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)]">
                    Số lượng đơn trong kỳ đã chọn:
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-matcha-800 dark:text-matcha-300 mt-1">
                    {orderCard.periodOrderCount}{' '}
                    <span className="text-sm font-bold text-[var(--text-muted)]">Đơn hàng</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                    <ShoppingBag className="w-3.5 h-3.5 text-matcha-600" />
                    <span>Tổng số đơn hệ thống:</span>
                  </div>
                  <div className="text-base font-black text-matcha-900 dark:text-matcha-200 mt-0.5">
                    {orderCard.totalSystemOrders} đơn đã tạo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 2: BIỂU ĐỒ TỔNG HỢP THEO THÁNG (CỘT = DOANH THU, ĐƯỜNG = ĐƠN) */}
          {/* ================================================================= */}
          <div className="nocha-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base sm:text-lg text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-matcha-600" />
                  Biểu Đồ Doanh Thu &amp; Số Lượng Đơn Theo Tháng ({chartYear})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Cột thể hiện Doanh thu thuần (VNĐ) | Đường Line thể hiện Số lượng đơn theo từng tháng
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Legend */}
                <div className="flex items-center gap-4 font-bold mr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-matcha-700 to-matcha-400" />
                    <span className="text-matcha-800 dark:text-matcha-300">Doanh Thu (Cột)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-1 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Số Đơn (Đường)</span>
                  </div>
                </div>

                {/* Year Selector */}
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                >
                  {[defaultDates.year - 1, defaultDates.year, defaultDates.year + 1].map((yr) => (
                    <option key={yr} value={yr}>
                      Năm {yr}
                    </option>
                  ))}
                </select>

                {/* Staff Selector for Admin */}
                {user.role === 'ADMIN' && (
                  <select
                    value={chartStaffId}
                    onChange={(e) => setChartStaffId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                  >
                    <option value="ALL">Tất cả nhân viên</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Combined Bar + SVG Line Chart */}
            <div className="relative h-72 pt-10 pb-4 border-b border-[var(--border-color)]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="absolute inset-x-0 bottom-8 w-full h-[210px] pointer-events-none z-10"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="nochaLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <linearGradient id="nochaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {areaPathD && <path d={areaPathD} fill="url(#nochaAreaGrad)" />}

                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="url(#nochaLineGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div className="h-full flex items-end justify-between gap-1.5 sm:gap-3 px-1 sm:px-3 relative z-0">
                {monthlyChartData.map((item, idx) => {
                  const heightPct = Math.max(6, Math.round(((item.revenue || 0) / maxMonthRev) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative"
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute -top-12 z-30 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-matcha-950 text-white px-3 py-1.5 rounded-xl shadow-xl text-[11px] whitespace-nowrap flex flex-col items-center">
                        <span className="font-bold text-matcha-300">
                          {(item.revenue || 0).toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-amber-300 font-semibold">
                          {item.orders || 0} đơn ({item.completedOrders || 0} hoàn thành)
                        </span>
                      </div>

                      {/* Revenue Column Bar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[38px] bg-gradient-to-t from-matcha-800 via-matcha-600 to-matcha-400 rounded-t-xl group-hover:brightness-110 transition-all shadow-sm"
                      />

                      <span className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] mt-1">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 3: 2 BIỂU ĐỒ SẢN PHẨM (MỖI BIỂU ĐỒ CHIẾM 1/2 CHIỀU NGANG)     */}
          {/* 1. Sản phẩm bán chạy theo số lượng | 2. Sản phẩm doanh thu cao nhất */}
          {/* ================================================================= */}
          <div className="space-y-4">
            {/* Shared Date Range & Staff Filter Header for the 2 Product Charts */}
            <div className="nocha-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-matcha-600" />
                  Phân Tích Sản Phẩm Bán Chạy &amp; Doanh Thu Theo Món
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Bộ lọc thời gian từ ngày đến ngày áp dụng cho 2 biểu đồ sản phẩm bên dưới
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600" />
                  <span className="text-[var(--text-muted)] font-semibold">Từ:</span>
                  <input
                    type="date"
                    value={prodFrom}
                    onChange={(e) => setProdFrom(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600" />
                  <span className="text-[var(--text-muted)] font-semibold">Đến:</span>
                  <input
                    type="date"
                    value={prodTo}
                    onChange={(e) => setProdTo(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none"
                  />
                </div>

                {user.role === 'ADMIN' && (
                  <select
                    value={prodStaffId}
                    onChange={(e) => setProdStaffId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                  >
                    <option value="ALL">Tất cả nhân viên</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2 Half-Width Charts on Wide Screen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Biểu đồ 1: Sản phẩm bán chạy theo SỐ LƯỢNG */}
              <div className="nocha-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-matcha-900 dark:text-matcha-100">
                      1. Sản Phẩm Bán Chạy Theo Số Lượng
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Xếp hạng theo tổng số cốc đã bán hoàn thành
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300">
                    Theo Số Cốc
                  </span>
                </div>

                {topProductsByQty.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
                    Chưa có dữ liệu sản phẩm hoàn thành trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {topProductsByQty.map((prod, idx) => {
                      const widthPct = Math.max(8, Math.round((prod.totalQuantity / maxProdQty) * 100));
                      return (
                        <div key={prod.productId || idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-matcha-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              {prod.productImage && (
                                <img
                                  src={prod.productImage}
                                  alt={prod.productName}
                                  className="w-7 h-7 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                                />
                              )}
                              <span className="font-bold truncate">{prod.productName}</span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="font-black text-matcha-700 dark:text-matcha-300">
                                {prod.totalQuantity} cốc
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1.5">
                                ({(prod.totalRevenue || 0).toLocaleString('vi-VN')}đ)
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-3 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                            <div
                              style={{ width: `${widthPct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-matcha-700 to-matcha-400 transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Biểu đồ 2: Sản phẩm mang về DOANH THU nhiều nhất */}
              <div className="nocha-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-matcha-900 dark:text-matcha-100">
                      2. Sản Phẩm Mang Về Doanh Thu Cao Nhất
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Xếp hạng theo doanh thu thuần (đã trừ chiết khấu, không gồm ship)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Theo Doanh Thu
                  </span>
                </div>

                {topProductsByRev.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
                    Chưa có dữ liệu doanh thu sản phẩm trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {topProductsByRev.map((prod, idx) => {
                      const widthPct = Math.max(8, Math.round((prod.totalRevenue / maxProdRev) * 100));
                      return (
                        <div key={prod.productId || idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              {prod.productImage && (
                                <img
                                  src={prod.productImage}
                                  alt={prod.productName}
                                  className="w-7 h-7 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                                />
                              )}
                              <span className="font-bold truncate">{prod.productName}</span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="font-black text-amber-700 dark:text-amber-400">
                                {(prod.totalRevenue || 0).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1.5">
                                ({prod.totalQuantity} cốc)
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-3 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                            <div
                              style={{ width: `${widthPct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* BẢNG THỐNG KÊ HIỆU SUẤT TỪNG NHÂN VIÊN (CHỈ ADMIN XEM ĐƯỢC)        */}
          {/* ================================================================= */}
          {user.role === 'ADMIN' && data?.staffStats && data.staffStats.length > 0 && (
            <div className="nocha-card p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-matcha-600" />
                    Bảng Tổng Hợp Doanh Số Từng Nhân Viên
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    So sánh số đơn và doanh thu của từng tài khoản nhân viên (nhấn Lọc Dashboard để xem riêng)
                  </p>
                </div>
                <Link
                  href="/users"
                  className="text-xs font-bold text-matcha-700 dark:text-matcha-300 hover:underline flex items-center gap-1"
                >
                  Quản lý nhân viên <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Nhân Viên</th>
                      <th className="py-3 px-4">Tài Khoản</th>
                      <th className="py-3 px-4">Vai Trò</th>
                      <th className="py-3 px-4 text-center">Đơn Trong Kỳ</th>
                      <th className="py-3 px-4">Doanh Thu Kỳ</th>
                      <th className="py-3 px-4 text-center">Tổng Đơn</th>
                      <th className="py-3 px-4">Tổng Doanh Thu</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {data.staffStats.map((st: any) => {
                      const isFiltered = globalStaffId === st.userId;
                      return (
                        <tr
                          key={st.userId}
                          className={
                            isFiltered
                              ? 'bg-matcha-100/60 dark:bg-matcha-900/30'
                              : 'hover:bg-[var(--bg-subtle)]/60 transition'
                          }
                        >
                          <td className="py-3.5 px-4 font-bold">
                            {st.displayName}
                            {st.isLocked && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 text-[10px]">
                                Đã khóa
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                            @{st.username}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.role === 'ADMIN'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-matcha-500/15 text-matcha-800 dark:text-matcha-300'
                              }`}
                            >
                              {st.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">{st.periodOrders}</td>
                          <td className="py-3.5 px-4 font-bold text-matcha-700 dark:text-matcha-300">
                            {(st.periodRevenue || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold">{st.totalOrders}</td>
                          <td className="py-3.5 px-4 font-black">
                            {(st.totalRevenue || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                handleGlobalStaffChange(isFiltered ? 'ALL' : st.userId)
                              }
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                                isFiltered
                                  ? 'matcha-gradient-btn text-white'
                                  : 'bg-[var(--bg-subtle)] hover:opacity-80 border border-[var(--border-color)]'
                              }`}
                            >
                              {isFiltered ? 'Đang lọc (Bỏ lọc)' : 'Lọc Dashboard'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

