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
  Warehouse,
  Wallet,
  LineChart,
  PackagePlus,
} from 'lucide-react';

function getMonthDateRange() {
  const now = new Date();
  const y = now.getFullYear();
  const mNum = now.getMonth() + 1;
  const m = String(mNum).padStart(2, '0');
  const lastDay = new Date(y, mNum, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    month: mNum,
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

  // Card 3: Net Profit (Thu - Chi) Filter State (Admin)
  const [netFrom, setNetFrom] = useState(defaultDates.start);
  const [netTo, setNetTo] = useState(defaultDates.end);

  // Daily Revenue & Order Chart Filter State (Month + Year + Staff)
  const [dailyMonth, setDailyMonth] = useState(defaultDates.month);
  const [dailyYear, setDailyYear] = useState(defaultDates.year);
  const [dailyStaffId, setDailyStaffId] = useState('ALL');

  // Monthly Revenue & Order Chart Filter State (Year + Staff)
  const [chartYear, setChartYear] = useState(defaultDates.year);
  const [chartStaffId, setChartStaffId] = useState('ALL');

  // Product Analytics Shared Filter State
  const [prodFrom, setProdFrom] = useState(defaultDates.start);
  const [prodTo, setProdTo] = useState(defaultDates.end);
  const [prodStaffId, setProdStaffId] = useState('ALL');

  // Inventory / Input Cost Analytics Filter State (Admin)
  const [expDailyMonth, setExpDailyMonth] = useState(defaultDates.month);
  const [expDailyYear, setExpDailyYear] = useState(defaultDates.year);
  const [expDailyCatId, setExpDailyCatId] = useState('ALL');

  const [expMonthlyYear, setExpMonthlyYear] = useState(defaultDates.year);
  const [expMonthlyCatId, setExpMonthlyCatId] = useState('ALL');

  const [expTopFrom, setExpTopFrom] = useState(defaultDates.start);
  const [expTopTo, setExpTopTo] = useState(defaultDates.end);
  const [expTopCatId, setExpTopCatId] = useState('ALL');

  const fetchDashboard = useCallback(async (params: Record<string, string | number>) => {
    try {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      });
      const res = await fetch(`/api/dashboard?${qs.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      netFrom,
      netTo,
      dailyMonth,
      dailyYear,
      dailyStaffId,
      year: chartYear,
      chartStaffId,
      prodFrom,
      prodTo,
      prodStaffId,
      expDailyMonth,
      expDailyYear,
      expDailyCatId,
      expMonthlyYear,
      expMonthlyCatId,
      expTopFrom,
      expTopTo,
      expTopCatId,
    });
  }, [
    user,
    revFrom,
    revTo,
    revStaffId,
    ordFrom,
    ordTo,
    ordStaffId,
    netFrom,
    netTo,
    dailyMonth,
    dailyYear,
    dailyStaffId,
    chartYear,
    chartStaffId,
    prodFrom,
    prodTo,
    prodStaffId,
    expDailyMonth,
    expDailyYear,
    expDailyCatId,
    expMonthlyYear,
    expMonthlyCatId,
    expTopFrom,
    expTopTo,
    expTopCatId,
    fetchDashboard,
  ]);

  const handleGlobalStaffChange = (staffId: string) => {
    setGlobalStaffId(staffId);
    setRevStaffId(staffId);
    setOrdStaffId(staffId);
    setDailyStaffId(staffId);
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
  const netProfitCard = data?.netProfitCard || {
    periodRevenue: 0,
    periodExpense: 0,
    periodNetProfit: 0,
    periodEntryCount: 0,
    allTimeRevenue: 0,
    allTimeExpense: 0,
    allTimeNetProfit: 0,
  };

  // --- Daily Revenue + Order Chart Geometry ---
  const dailyChartData: any[] = data?.dailyChartData || [];
  const maxDailyRev = Math.max(...dailyChartData.map((d) => d.revenue || 0), 100000);
  const maxDailyOrders = Math.max(...dailyChartData.map((d) => d.orders || 0), 5);
  const dailyChartWidth = 1200;
  const dailyChartHeight = 220;
  const dailyCount = Math.max(dailyChartData.length, 1);

  const dailyPoints = dailyChartData.map((item, i) => {
    const x = (i + 0.5) * (dailyChartWidth / dailyCount);
    const y = 185 - ((item.orders || 0) / maxDailyOrders) * 145;
    return { x, y, orders: item.orders, revenue: item.revenue, day: item.day };
  });

  const dailyLinePathD = dailyPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const dailyAreaPathD =
    dailyPoints.length > 0
      ? `${dailyLinePathD} L ${dailyPoints[dailyPoints.length - 1].x} 200 L ${dailyPoints[0].x} 200 Z`
      : '';

  // --- Monthly Revenue + Order Chart Geometry ---
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

  // --- Top Products ---
  const topProductsByQty: any[] = data?.topProductsByQuantity || [];
  const topProductsByRev: any[] = data?.topProductsByRevenue || [];
  const maxProdQty = Math.max(...topProductsByQty.map((p) => p.totalQuantity || 0), 1);
  const maxProdRev = Math.max(...topProductsByRev.map((p) => p.totalRevenue || 0), 10000);

  // --- Inventory / Input Cost Analytics (Admin) ---
  const invAnalytics = data?.inventoryAnalytics || {
    categories: [],
    dailyExpenseChart: [],
    monthlyExpenseChart: [],
    topExpenseItems: [],
    totalTopPeriodExpense: 0,
  };
  const invCategories: any[] = invAnalytics.categories || [];
  const dailyExpenseChart: any[] = invAnalytics.dailyExpenseChart || [];
  const monthlyExpenseChart: any[] = invAnalytics.monthlyExpenseChart || [];
  const topExpenseItems: any[] = invAnalytics.topExpenseItems || [];
  const totalTopPeriodExpense = Number(invAnalytics.totalTopPeriodExpense || 0);

  // Daily Expense SVG Line Geometry
  const maxDailyExp = Math.max(...dailyExpenseChart.map((d) => d.cost || 0), 100000);
  const expDailyCount = Math.max(dailyExpenseChart.length, 1);
  const expDailyPoints = dailyExpenseChart.map((item, i) => {
    const x = (i + 0.5) * (1000 / expDailyCount);
    const y = 175 - ((item.cost || 0) / maxDailyExp) * 135;
    return { x, y, cost: item.cost || 0, entryCount: item.entryCount || 0, day: item.day };
  });
  const expDailyLineD = expDailyPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const expDailyAreaD =
    expDailyPoints.length > 0
      ? `${expDailyLineD} L ${expDailyPoints[expDailyPoints.length - 1].x} 195 L ${expDailyPoints[0].x} 195 Z`
      : '';

  // Monthly Expense SVG Line Geometry
  const maxMonthlyExp = Math.max(...monthlyExpenseChart.map((d) => d.cost || 0), 100000);
  const expMonthlyPoints = monthlyExpenseChart.map((item, i) => {
    const x = (i + 0.5) * (1000 / 12);
    const y = 175 - ((item.cost || 0) / maxMonthlyExp) * 135;
    return { x, y, cost: item.cost || 0, entryCount: item.entryCount || 0, month: item.month };
  });
  const expMonthlyLineD = expMonthlyPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const expMonthlyAreaD =
    expMonthlyPoints.length > 0
      ? `${expMonthlyLineD} L ${expMonthlyPoints[expMonthlyPoints.length - 1].x} 195 L ${expMonthlyPoints[0].x} 195 Z`
      : '';

  const maxTopItemCost = Math.max(...topExpenseItems.map((it) => it.totalAdjusted || 0), 10000);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar user={user} />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto overflow-x-hidden">
          {/* Top Action & Global Filter Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-matcha-600 shrink-0" />
                <span className="min-w-0 break-words xl:truncate">
                  {user.role === 'ADMIN'
                    ? 'Dashboard Quản Trị Doanh Thu & Chi Phí NOCHA'
                    : `Dashboard Cá Nhân — ${user.displayName}`}
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {user.role === 'ADMIN'
                  ? 'Thống kê doanh thu thuần (không tính phí ship), doanh số ròng (Thu - Chi), lượng đơn và chi phí đầu vào'
                  : 'Thống kê doanh thu thuần (không tính phí ship), số đơn hàng và sản phẩm bán chạy do bạn tạo'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto xl:flex-nowrap min-w-0">
              {user.role === 'ADMIN' && staffList.length > 0 && (
                <div className="flex items-center justify-between sm:justify-start gap-2 nocha-card px-3 py-2 w-full sm:w-auto min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users className="w-4 h-4 text-matcha-600 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">
                      Đồng bộ NV:
                    </span>
                  </div>
                  <select
                    value={globalStaffId}
                    onChange={(e) => handleGlobalStaffChange(e.target.value)}
                    className="flex-1 sm:flex-initial min-w-0 max-w-[175px] sm:max-w-[190px] truncate bg-[var(--bg-subtle)] text-[var(--text-main)] text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-color)] focus:outline-none focus:border-matcha-600 cursor-pointer"
                  >
                    <option value="ALL">Tất cả nhân viên</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {user.role === 'ADMIN' && (
                <Link
                  href="/inventory"
                  className="px-4 py-2.5 rounded-xl nocha-card font-extrabold text-xs text-matcha-800 dark:text-matcha-300 hover:border-matcha-500 flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                >
                  <PackagePlus className="w-4 h-4 text-matcha-600 shrink-0" />
                  <span>NHẬP KHO</span>
                </Link>
              )}

              <Link
                href="/orders/create"
                className="px-4 sm:px-5 py-2.5 rounded-xl matcha-gradient-btn font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>TẠO ĐƠN MỚI</span>
              </Link>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 1: KPI CARDS (DOANH THU, SỐ ĐƠN, VÀ DOANH SỐ THU - CHI)       */}
          {/* ================================================================= */}
          <div
            className={`grid grid-cols-1 ${
              user.role === 'ADMIN' ? 'xl:grid-cols-3' : 'lg:grid-cols-2'
            } gap-5`}
          >
            {/* CARD 1: THỐNG KÊ DOANH THU */}
            <div className="nocha-card p-5 space-y-4 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2 text-matcha-700 dark:text-matcha-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 flex items-center justify-center text-matcha-700 dark:text-matcha-300 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span>Thống Kê Doanh Thu (Thu)</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300">
                    Hoàn thành: {revenueCard.completedOrderCount} đơn
                  </span>
                </div>

                {/* Filter Bar inside Card 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[var(--bg-subtle)] p-2.5 rounded-xl border border-[var(--border-color)] text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={revFrom}
                      onChange={(e) => setRevFrom(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
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
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Nhân viên
                    </label>
                    {user.role === 'ADMIN' ? (
                      <select
                        value={revStaffId}
                        onChange={(e) => setRevStaffId(e.target.value)}
                        className="w-full min-w-0 truncate px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                      >
                        <option value="ALL">Tất cả NV</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-matcha-700 dark:text-matcha-300 truncate">
                        {user.displayName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Metric & System Total */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)]">
                    Doanh thu thuần trong kỳ:
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-matcha-800 dark:text-matcha-300 mt-1">
                    {(revenueCard.periodRevenue || 0).toLocaleString('vi-VN')}{' '}
                    <span className="text-xs font-bold text-[var(--text-muted)]">VNĐ</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 text-xs">
                  <div className="flex items-center gap-1 text-[var(--text-muted)] font-medium text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-matcha-600" />
                    <span>Tổng thu hệ thống:</span>
                  </div>
                  <div className="text-sm font-black text-matcha-900 dark:text-matcha-200 mt-0.5">
                    {(revenueCard.totalSystemRevenue || 0).toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: THỐNG KÊ SỐ LƯỢNG ĐƠN */}
            <div className="nocha-card p-5 space-y-4 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2 text-matcha-700 dark:text-matcha-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-xl bg-matcha-100 dark:bg-matcha-900/60 flex items-center justify-center text-matcha-700 dark:text-matcha-300 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span>Thống Kê Số Lượng Đơn</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Xong: {orderCard.periodCompletedOrders}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                      Giao: {orderCard.periodShippingOrders}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Chờ: {orderCard.periodCreatedOrders}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                      Hủy: {orderCard.periodCancelledOrders}
                    </span>
                  </div>
                </div>

                {/* Filter Bar inside Card 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[var(--bg-subtle)] p-2.5 rounded-xl border border-[var(--border-color)] text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={ordFrom}
                      onChange={(e) => setOrdFrom(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
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
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      Nhân viên
                    </label>
                    {user.role === 'ADMIN' ? (
                      <select
                        value={ordStaffId}
                        onChange={(e) => setOrdStaffId(e.target.value)}
                        className="w-full min-w-0 truncate px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                      >
                        <option value="ALL">Tất cả NV</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-matcha-700 dark:text-matcha-300 truncate">
                        {user.displayName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Metric & System Total */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)]">
                    Số lượng đơn trong kỳ:
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-matcha-800 dark:text-matcha-300 mt-1">
                    {orderCard.periodOrderCount}{' '}
                    <span className="text-xs font-bold text-[var(--text-muted)]">Đơn hàng</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-matcha-50 dark:bg-matcha-950/60 border border-matcha-200 dark:border-matcha-800 text-xs">
                  <div className="flex items-center gap-1 text-[var(--text-muted)] font-medium text-[11px]">
                    <ShoppingBag className="w-3.5 h-3.5 text-matcha-600" />
                    <span>Tổng đơn hệ thống:</span>
                  </div>
                  <div className="text-sm font-black text-matcha-900 dark:text-matcha-200 mt-0.5">
                    {orderCard.totalSystemOrders} đơn đã tạo
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: THỐNG KÊ DOANH SỐ RÒNG (LẤY THU TRỪ ĐI CHI — CHỈ DÀNH CHO ADMIN) */}
            {user.role === 'ADMIN' && (
              <div className="nocha-card p-5 space-y-4 relative overflow-hidden border-2 border-amber-500/40 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span>Thống Kê Doanh Số (Thu - Chi)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                      Nhập kho: {netProfitCard.periodEntryCount} phiếu
                    </span>
                  </div>

                  {/* Filter Bar inside Card 3 */}
                  <div className="grid grid-cols-2 gap-2 bg-[var(--bg-subtle)] p-2.5 rounded-xl border border-[var(--border-color)] text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                        Từ ngày
                      </label>
                      <input
                        type="date"
                        value={netFrom}
                        onChange={(e) => setNetFrom(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                        Đến ngày
                      </label>
                      <input
                        type="date"
                        value={netTo}
                        onChange={(e) => setNetTo(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-semibold text-xs"
                      />
                    </div>
                  </div>

                  {/* Breakdown Thu vs Chi */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                        Tổng Thu Kỳ:
                      </div>
                      <div className="font-black text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm">
                        +{(netProfitCard.periodRevenue || 0).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 uppercase">
                        Tổng Chi Nhập Kho:
                      </div>
                      <div className="font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                        -{(netProfitCard.periodExpense || 0).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Metric: Net Profit (Thu - Chi) */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-muted)]">
                      Doanh số ròng (Thu - Chi):
                    </div>
                    <div
                      className={`text-2xl sm:text-3xl font-black mt-1 ${
                        netProfitCard.periodNetProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {netProfitCard.periodNetProfit > 0 ? '+' : ''}
                      {(netProfitCard.periodNetProfit || 0).toLocaleString('vi-VN')}{' '}
                      <span className="text-xs font-bold text-[var(--text-muted)]">VNĐ</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">
                      Lợi nhuận toàn thời gian:
                    </div>
                    <div
                      className={`text-sm font-black mt-0.5 ${
                        netProfitCard.allTimeNetProfit >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {(netProfitCard.allTimeNetProfit || 0).toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ROW 2A: BIỂU ĐỒ DOANH THU & SỐ LƯỢNG ĐƠN THEO NGÀY (THÁNG & NĂM)  */}
          {/* ================================================================= */}
          <div className="nocha-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base sm:text-lg text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-matcha-600" />
                  Biểu Đồ Doanh Thu &amp; Số Lượng Đơn Theo Ngày (Tháng {dailyMonth}/{dailyYear})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Cột thể hiện Doanh thu thuần từng ngày (VNĐ) | Đường Line thể hiện Số lượng đơn theo ngày
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-3 font-bold mr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-matcha-700 to-matcha-400" />
                    <span className="text-matcha-800 dark:text-matcha-300">Doanh Thu (Cột)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-1 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Số Đơn (Đường)</span>
                  </div>
                </div>

                {/* Month Selector */}
                <select
                  value={dailyMonth}
                  onChange={(e) => setDailyMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs shrink-0"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={dailyYear}
                  onChange={(e) => setDailyYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs shrink-0"
                >
                  {[defaultDates.year - 1, defaultDates.year, defaultDates.year + 1].map((yr) => (
                    <option key={yr} value={yr}>
                      Năm {yr}
                    </option>
                  ))}
                </select>

                {user.role === 'ADMIN' && (
                  <select
                    value={dailyStaffId}
                    onChange={(e) => setDailyStaffId(e.target.value)}
                    className="flex-1 sm:flex-initial min-w-0 max-w-[175px] sm:max-w-[200px] truncate px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs"
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

            {/* Combined Daily Bar + SVG Line Chart */}
            <div className="overflow-x-auto pb-2">
              <div className="relative h-72 pt-10 pb-4 border-b border-[var(--border-color)] min-w-[680px]">
                <svg
                  viewBox={`0 0 ${dailyChartWidth} ${dailyChartHeight}`}
                  className="absolute inset-x-0 bottom-8 w-full h-[210px] pointer-events-none z-10"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="dailyLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="dailyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {dailyAreaPathD && <path d={dailyAreaPathD} fill="url(#dailyAreaGrad)" />}

                  {dailyLinePathD && (
                    <path
                      d={dailyLinePathD}
                      fill="none"
                      stroke="url(#dailyLineGrad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {dailyPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>

                <div className="h-full flex items-end justify-between gap-1 px-1 relative z-0">
                  {dailyChartData.map((item, idx) => {
                    const heightPct = Math.max(
                      5,
                      Math.round(((item.revenue || 0) / maxDailyRev) * 100)
                    );
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative"
                      >
                        <div className="absolute -top-12 z-30 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-matcha-950 text-white px-2.5 py-1 rounded-xl shadow-xl text-[10px] whitespace-nowrap flex flex-col items-center">
                          <span className="font-bold text-matcha-300">
                            Ngày {item.day}/{dailyMonth}: {(item.revenue || 0).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-amber-300 font-semibold">
                            {item.orders || 0} đơn ({item.completedOrders || 0} hoàn thành)
                          </span>
                        </div>

                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[24px] bg-gradient-to-t from-matcha-800 via-matcha-600 to-matcha-400 rounded-t-lg group-hover:brightness-110 transition-all shadow-sm"
                        />

                        <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)]">
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 2B: BIỂU ĐỒ TỔNG HỢP THEO THÁNG (CỘT = DOANH THU, ĐƯỜNG = ĐƠN) */}
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
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs shrink-0"
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
                    className="flex-1 sm:flex-initial min-w-0 max-w-[175px] sm:max-w-[200px] truncate px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs"
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
                  const heightPct = Math.max(
                    6,
                    Math.round(((item.revenue || 0) / maxMonthRev) * 100)
                  );
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative"
                    >
                      <div className="absolute -top-12 z-30 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-matcha-950 text-white px-3 py-1.5 rounded-xl shadow-xl text-[11px] whitespace-nowrap flex flex-col items-center">
                        <span className="font-bold text-matcha-300">
                          {(item.revenue || 0).toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-amber-300 font-semibold">
                          {item.orders || 0} đơn ({item.completedOrders || 0} hoàn thành)
                        </span>
                      </div>

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
          {/* ROW 3: 2 BIỂU ĐỒ SẢN PHẨM BÁN RA                                  */}
          {/* ================================================================= */}
          <div className="space-y-4">
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

              <div className="flex flex-wrap items-center gap-2.5 text-xs min-w-0">
                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                  <span className="text-[var(--text-muted)] font-semibold shrink-0">Từ:</span>
                  <input
                    type="date"
                    value={prodFrom}
                    onChange={(e) => setProdFrom(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none min-w-0 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                  <span className="text-[var(--text-muted)] font-semibold shrink-0">Đến:</span>
                  <input
                    type="date"
                    value={prodTo}
                    onChange={(e) => setProdTo(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none min-w-0 text-xs"
                  />
                </div>

                {user.role === 'ADMIN' && (
                  <select
                    value={prodStaffId}
                    onChange={(e) => setProdStaffId(e.target.value)}
                    className="w-full sm:w-auto min-w-0 max-w-full sm:max-w-[200px] truncate px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs"
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
                      const widthPct = Math.max(
                        8,
                        Math.round((prod.totalQuantity / maxProdQty) * 100)
                      );
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
                      const widthPct = Math.max(
                        8,
                        Math.round((prod.totalRevenue / maxProdRev) * 100)
                      );
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
          {/* ROW 4: PHÂN HỆ QUẢN LÝ ĐẦU VÀO & CHI PHÍ NHẬP KHO (CHỈ ADMIN)     */}
          {/* 1. Biểu đồ đường chi phí theo ngày | 2. Biểu đồ đường theo tháng  */}
          {/* 3. Bảng Top 10 chi phí các sản phẩm nhập (lọc Từ ngày - Đến ngày) */}
          {/* ================================================================= */}
          {user.role === 'ADMIN' && (
            <div className="space-y-5 pt-2">
              <div className="nocha-card p-4 sm:p-5 border-l-[6px] border-l-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-amber-500" />
                    Phân Hệ Quản Lý Đầu Vào &amp; Chi Phí Nhập Kho
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Theo dõi biến động chi phí nhập nguyên liệu, đồ dùng, dịch vụ theo ngày, theo tháng và Top 10 mặt hàng chi phí cao nhất
                  </p>
                </div>

                <Link
                  href="/inventory"
                  className="px-4 py-2 rounded-xl matcha-gradient-btn text-white text-xs font-extrabold flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Quản Lý Nhập Kho</span>
                </Link>
              </div>

              {/* 2 BIỂU ĐỒ ĐƯỜNG CHI PHÍ NHẬP KHO: THEO NGÀY & THEO THÁNG */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 1. Biểu đồ đường chi phí nhập theo NGÀY */}
                <div className="nocha-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-rose-500" />
                        1. Biểu Đồ Đường Chi Phí Nhập Theo Ngày (T{expDailyMonth}/{expDailyYear})
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Tổng thực chi nhập kho từng ngày trong tháng
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={expDailyMonth}
                        onChange={(e) => setExpDailyMonth(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      >
                        {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                          <option key={m} value={m}>
                            Tháng {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={expDailyYear}
                        onChange={(e) => setExpDailyYear(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      >
                        {[defaultDates.year - 1, defaultDates.year, defaultDates.year + 1].map(
                          (yr) => (
                            <option key={yr} value={yr}>
                              Năm {yr}
                            </option>
                          )
                        )}
                      </select>

                      <select
                        value={expDailyCatId}
                        onChange={(e) => setExpDailyCatId(e.target.value)}
                        className="min-w-0 max-w-[150px] truncate px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      >
                        <option value="ALL">Tất cả danh mục</option>
                        {invCategories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <div className="relative h-60 pt-8 pb-6 border-b border-[var(--border-color)] min-w-[540px]">
                      <svg
                        viewBox="0 0 1000 200"
                        className="absolute inset-x-0 bottom-6 w-full h-[185px] pointer-events-none z-10"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="expDailyArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {expDailyAreaD && <path d={expDailyAreaD} fill="url(#expDailyArea)" />}
                        {expDailyLineD && (
                          <path
                            d={expDailyLineD}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        {expDailyPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            fill="#f43f5e"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        ))}
                      </svg>

                      <div className="h-full flex items-end justify-between gap-1 px-1 relative z-20">
                        {dailyExpenseChart.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="absolute -top-6 z-30 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-lg text-[10px] whitespace-nowrap flex flex-col items-center">
                              <span className="font-bold text-rose-300">
                                Ngày {item.day}/{expDailyMonth}:{' '}
                                {(item.cost || 0).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-slate-300">
                                {item.entryCount || 0} phiếu nhập
                              </span>
                            </div>
                            <div className="w-full h-full hover:bg-rose-500/5 rounded transition" />
                            <span className="text-[9px] font-bold text-[var(--text-muted)] mt-1">
                              {item.day}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Biểu đồ đường chi phí nhập theo THÁNG */}
                <div className="nocha-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-amber-500" />
                        2. Biểu Đồ Đường Chi Phí Nhập Theo Tháng ({expMonthlyYear})
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Tổng thực chi nhập kho qua 12 tháng trong năm
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={expMonthlyYear}
                        onChange={(e) => setExpMonthlyYear(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      >
                        {[defaultDates.year - 1, defaultDates.year, defaultDates.year + 1].map(
                          (yr) => (
                            <option key={yr} value={yr}>
                              Năm {yr}
                            </option>
                          )
                        )}
                      </select>

                      <select
                        value={expMonthlyCatId}
                        onChange={(e) => setExpMonthlyCatId(e.target.value)}
                        className="min-w-0 max-w-[160px] truncate px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold"
                      >
                        <option value="ALL">Tất cả danh mục</option>
                        {invCategories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative h-60 pt-8 pb-6 border-b border-[var(--border-color)]">
                    <svg
                      viewBox="0 0 1000 200"
                      className="absolute inset-x-0 bottom-6 w-full h-[185px] pointer-events-none z-10"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="expMonthlyArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {expMonthlyAreaD && <path d={expMonthlyAreaD} fill="url(#expMonthlyArea)" />}
                      {expMonthlyLineD && (
                        <path
                          d={expMonthlyLineD}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {expMonthlyPoints.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>

                    <div className="h-full flex items-end justify-between gap-2 px-2 relative z-20">
                      {monthlyExpenseChart.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          <div className="absolute -top-6 z-30 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-lg text-[10px] whitespace-nowrap flex flex-col items-center">
                            <span className="font-bold text-amber-300">
                              {item.month}/{expMonthlyYear}:{' '}
                              {(item.cost || 0).toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-slate-300">
                              {item.entryCount || 0} phiếu nhập
                            </span>
                          </div>
                          <div className="w-full h-full hover:bg-amber-500/5 rounded transition" />
                          <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1">
                            {item.month}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BẢNG TOP 10 CHI PHÍ CÁC SẢN PHẨM NHẬP KHO (CHỌN TỪ NGÀY - ĐẾN NGÀY, CHỌN DANH MỤC) */}
              <div className="nocha-card p-5 sm:p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                  <div>
                    <h4 className="font-black text-base text-matcha-900 dark:text-matcha-100 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Bảng Top 10 Chi Phí Các Sản Phẩm Nhập Kho Cao Nhất
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Lọc theo khoảng thời gian từ ngày đến ngày và theo danh mục kho (Nguyên liệu, Đồ dùng, Dịch vụ, Thiết bị)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[var(--text-muted)] font-semibold">Từ:</span>
                      <input
                        type="date"
                        value={expTopFrom}
                        onChange={(e) => setExpTopFrom(e.target.value)}
                        className="bg-transparent font-bold focus:outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[var(--text-muted)] font-semibold">Đến:</span>
                      <input
                        type="date"
                        value={expTopTo}
                        onChange={(e) => setExpTopTo(e.target.value)}
                        className="bg-transparent font-bold focus:outline-none text-xs"
                      />
                    </div>

                    <select
                      value={expTopCatId}
                      onChange={(e) => setExpTopCatId(e.target.value)}
                      className="min-w-0 max-w-[180px] truncate px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-bold text-xs"
                    >
                      <option value="ALL">Tất cả danh mục kho</option>
                      {invCategories.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 font-black text-rose-600 dark:text-rose-400">
                      Tổng chi kỳ: {totalTopPeriodExpense.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                {topExpenseItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[var(--text-muted)] italic">
                    Chưa có phiếu nhập kho nào trong khoảng thời gian và danh mục đã chọn
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--bg-subtle)] uppercase text-[var(--text-muted)] border-b border-[var(--border-color)] text-[11px]">
                        <tr>
                          <th className="py-3 px-4 w-14">Hạng</th>
                          <th className="py-3 px-4">Sản Phẩm / Dịch Vụ Nhập</th>
                          <th className="py-3 px-4">Danh Mục Kho</th>
                          <th className="py-3 px-4 text-center">Tổng SL Nhập</th>
                          <th className="py-3 px-4 text-center">Số Lần Nhập</th>
                          <th className="py-3 px-4">Tổng Tạm Tính</th>
                          <th className="py-3 px-4">Tổng Thực Chi</th>
                          <th className="py-3 px-4 w-48">Tỉ Trọng Chi Phí</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {topExpenseItems.map((it: any, idx: number) => {
                          const sharePct =
                            totalTopPeriodExpense > 0
                              ? Math.round((it.totalAdjusted / totalTopPeriodExpense) * 100)
                              : 0;
                          const barWidth = Math.max(
                            6,
                            Math.round((it.totalAdjusted / maxTopItemCost) * 100)
                          );

                          return (
                            <tr key={it.itemId || idx} className="hover:bg-[var(--bg-subtle)]">
                              <td className="py-3.5 px-4">
                                <span
                                  className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center ${
                                    idx === 0
                                      ? 'bg-rose-600 text-white'
                                      : idx === 1
                                      ? 'bg-amber-500 text-slate-950'
                                      : idx === 2
                                      ? 'bg-amber-600/80 text-white'
                                      : 'bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)]'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-sm text-[var(--text-main)]">
                                {it.itemName}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-matcha-100 dark:bg-matcha-900/60 text-matcha-800 dark:text-matcha-300">
                                  {it.categoryName}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold">
                                {it.totalQuantity} {it.unit}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold">
                                {it.entryCount} lần
                              </td>
                              <td className="py-3.5 px-4 text-[var(--text-muted)]">
                                {(it.totalCalculated || 0).toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3.5 px-4 font-black text-rose-600 dark:text-rose-400">
                                {(it.totalAdjusted || 0).toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                                    <div
                                      style={{ width: `${barWidth}%` }}
                                      className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500"
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold w-9 text-right">
                                    {sharePct}%
                                  </span>
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
            </div>
          )}

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
                              type="button"
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
