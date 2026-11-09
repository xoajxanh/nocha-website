'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, BellOff, Volume2, Smartphone, X, Send } from 'lucide-react';

// ============================================================================
// A. CHUÔNG TRONG WEB: poll đơn PENDING mỗi 15s, có đơn mới -> kêu chuông + banner
// B. WEB PUSH: đăng ký Service Worker + PushManager để nhận thông báo khi tắt web
// ============================================================================

const POLL_INTERVAL_MS = 15000;
const LAST_SEEN_KEY = 'nocha_last_pending_at';
export const NEW_ORDER_EVENT = 'nocha:new-order';
// Phát sự kiện này sau khi xác nhận/hủy đơn để chuông cập nhật số đơn chờ ngay
export const PENDING_CHANGED_EVENT = 'nocha:pending-changed';

// ---------- Âm thanh (singleton theo module để sống qua các lần chuyển trang) ----------
let audioCtx: AudioContext | null = null;
let gestureListenerAttached = false;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  // iOS: phát 1 buffer rỗng trong thao tác chạm để "mở khóa" âm thanh
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

// iPad/iPhone chặn tự phát âm thanh -> chạm bất kỳ đâu trên trang 1 lần là mở khóa chuông
function attachGestureUnlock() {
  if (gestureListenerAttached || typeof window === 'undefined') return;
  gestureListenerAttached = true;
  const handler = () => unlockAudio();
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, handler, { passive: true })
  );
}

function isAudioUnlocked() {
  return !!audioCtx && audioCtx.state === 'running';
}

export function playNewOrderChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const notes = [880, 1174.66, 1567.98]; // A5 - D6 - G6 "ting ting ting"
  const start = ctx.currentTime + 0.05;
  for (let round = 0; round < 3; round++) {
    notes.forEach((freq, i) => {
      const t = start + round * 0.9 + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }
}

// ---------- Push helpers ----------
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

type PushState = 'loading' | 'unsupported' | 'need-install' | 'denied' | 'off' | 'on';

export default function OrderNotifier() {
  const [pendingCount, setPendingCount] = useState(0);
  const [banner, setBanner] = useState<{ id: string; name: string; amount: number } | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [pushState, setPushState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const baseTitleRef = useRef<string>('');
  const panelRef = useRef<HTMLDivElement>(null);

  // ---------- A. Poll đơn chờ xác nhận ----------
  const checkPending = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/pending-summary', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const count = Number(json.pendingCount) || 0;
      setPendingCount(count);

      const latest = json.latest;
      let lastSeen = 0;
      try {
        lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
      } catch {}
      if (!latest) {
        // Chưa có đơn chờ: đặt mốc tối thiểu để đơn đầu tiên sắp tới vẫn kêu chuông
        if (lastSeen === 0) {
          try {
            localStorage.setItem(LAST_SEEN_KEY, '1');
          } catch {}
        }
        return;
      }
      const latestAt = new Date(latest.createdAt).getTime();

      if (latestAt > lastSeen) {
        try {
          localStorage.setItem(LAST_SEEN_KEY, String(latestAt));
        } catch {}
        // Lần đầu (chưa có mốc) chỉ ghi mốc, không kêu để tránh kêu lại đơn cũ
        if (lastSeen > 0) {
          playNewOrderChime();
          setBanner({ id: latest.id, name: latest.customerName, amount: latest.finalAmount });
          window.dispatchEvent(new CustomEvent(NEW_ORDER_EVENT, { detail: latest }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    attachGestureUnlock();
    baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, '');
    checkPending();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') checkPending();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkPending();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Push tới khi đang mở web -> SW báo sang -> kiểm tra ngay
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NOCHA_NEW_ORDER') checkPending();
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    const onPendingChanged = () => checkPending();
    window.addEventListener(PENDING_CHANGED_EVENT, onPendingChanged);

    const soundTimer = setInterval(() => setSoundOn(isAudioUnlocked()), 1500);

    return () => {
      clearInterval(timer);
      clearInterval(soundTimer);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      window.removeEventListener(PENDING_CHANGED_EVENT, onPendingChanged);
    };
  }, [checkPending]);

  // Tiêu đề tab: "(2) NOCHA ..."
  useEffect(() => {
    const base = baseTitleRef.current || document.title.replace(/^\(\d+\)\s*/, '');
    document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
  }, [pendingCount]);

  // Banner tự ẩn sau 15s
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 15000);
    return () => clearTimeout(t);
  }, [banner]);

  // Đóng panel khi bấm ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // ---------- B. Web Push ----------
  const refreshPushState = useCallback(async () => {
    if (!isPushSupported()) {
      setPushState(isIOSDevice() && !isStandalone() ? 'need-install' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushState('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        setPushState('on');
        // Đồng bộ lại lên server (phòng khi server mất bản ghi / đổi tài khoản)
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SUBSCRIBE', subscription: sub.toJSON() }),
        }).catch(() => {});
      } else {
        setPushState('off');
      }
    } catch {
      setPushState('unsupported');
    }
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const enablePush = async () => {
    setBusy(true);
    setMsg(null);
    unlockAudio();
    try {
      // Phải gọi trực tiếp trong thao tác bấm (yêu cầu của iOS)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'off');
        setMsg('Chưa được cấp quyền thông báo');
        return;
      }
      const keyRes = await fetch('/api/push');
      const keyJson = await keyRes.json();
      if (!keyJson.enabled || !keyJson.publicKey) {
        throw new Error('Server chưa cấu hình VAPID key');
      }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
        });
      }
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBSCRIBE', subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Không lưu được đăng ký');
      setPushState('on');
      setMsg('Đã bật thông báo cho thiết bị này ✅');
    } catch (err: any) {
      setMsg(err?.message || 'Không bật được thông báo');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState('off');
      setMsg('Đã tắt thông báo trên thiết bị này');
    } catch (err: any) {
      setMsg(err?.message || 'Lỗi khi tắt thông báo');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gửi thử thất bại');
      setMsg(
        json.sent > 0
          ? `Đã gửi thử tới ${json.sent} thiết bị của bạn`
          : 'Không có thiết bị nào nhận được, thử Tắt rồi Bật lại'
      );
    } catch (err: any) {
      setMsg(err?.message || 'Gửi thử thất bại');
    } finally {
      setBusy(false);
    }
  };

  const allGood = soundOn && pushState === 'on';
  const BellIcon = pendingCount > 0 ? BellRing : allGood || soundOn ? Bell : BellOff;

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            setSoundOn(isAudioUnlocked());
            setOpen((v) => !v);
          }}
          className={`relative p-2 rounded-xl border transition shrink-0 touch-manipulation ${
            pendingCount > 0
              ? 'bg-purple-600 border-purple-600 text-white animate-pulse'
              : 'bg-[var(--bg-subtle)] border-[var(--border-color)] text-matcha-600 dark:text-matcha-400 hover:opacity-80'
          }`}
          title="Thông báo đơn mới"
          aria-label="Thông báo đơn mới"
        >
          <BellIcon className="w-4 h-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-[var(--bg-card)]">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          {pendingCount === 0 && !allGood && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[var(--bg-card)]" />
          )}
        </button>

        {open && (
          <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[320px] max-h-[calc(100dvh-80px)] overflow-y-auto nocha-card p-3.5 shadow-2xl z-50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm">Thông báo đơn mới</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/orders"
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-xl font-bold ${
                pendingCount > 0
                  ? 'bg-purple-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {pendingCount > 0
                ? `👉 ${pendingCount} đơn đang chờ xác nhận — Xem ngay`
                : 'Không có đơn nào chờ xác nhận'}
            </Link>

            {/* A. Âm thanh trong web */}
            <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 min-w-0">
                  <Volume2 className="w-3.5 h-3.5 text-matcha-600 shrink-0" /> Chuông khi đang mở web
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] leading-4 font-black ${
                    soundOn ? 'bg-matcha-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {soundOn ? 'ĐANG BẬT' : 'CHƯA BẬT'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Kiểm tra đơn mới mỗi 15 giây. iPad cần chạm vào màn hình 1 lần sau khi mở web
                thì chuông mới kêu được.
              </p>
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  playNewOrderChime();
                  setSoundOn(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold touch-manipulation"
              >
                🔊 Nghe thử chuông
              </button>
            </div>

            {/* B. Web Push */}
            <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 min-w-0">
                  <Smartphone className="w-3.5 h-3.5 text-matcha-600 shrink-0" /> Thông báo khi tắt web
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] leading-4 font-black ${
                    pushState === 'on'
                      ? 'bg-matcha-500 text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {pushState === 'on' ? 'ĐANG BẬT' : 'CHƯA BẬT'}
                </span>
              </div>

              {pushState === 'need-install' && (
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                  Trên iPad/iPhone: mở web bằng Safari → nút Chia sẻ →{' '}
                  <strong>Thêm vào MH chính</strong>, sau đó mở app NOCHA từ màn hình chính rồi
                  bấm lại chuông này.
                </p>
              )}
              {pushState === 'unsupported' && (
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                  Trình duyệt này không hỗ trợ thông báo đẩy.
                </p>
              )}
              {pushState === 'denied' && (
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                  Thông báo đang bị chặn. Vào <strong>Cài đặt → Thông báo → NOCHA POS</strong>{' '}
                  để cho phép, rồi mở lại app.
                </p>
              )}
              {pushState === 'off' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={enablePush}
                  className="w-full px-3 py-2 rounded-lg matcha-gradient-btn font-black touch-manipulation disabled:opacity-60"
                >
                  {busy ? 'Đang bật...' : '🔔 Bật thông báo cho thiết bị này'}
                </button>
              )}
              {pushState === 'on' && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={sendTest}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-bold flex items-center justify-center gap-1 touch-manipulation disabled:opacity-60"
                  >
                    <Send className="w-3 h-3" /> Gửi thử
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={disablePush}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 font-bold touch-manipulation disabled:opacity-60"
                  >
                    Tắt
                  </button>
                </div>
              )}
            </div>

            {msg && <div className="text-[11px] font-semibold text-matcha-700 dark:text-matcha-300">{msg}</div>}
          </div>
        )}
      </div>

      {/* Banner đơn mới (hiện khi đang mở web) */}
      {banner && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[min(420px,calc(100vw-24px))] rounded-2xl shadow-2xl border-2 border-purple-500 bg-white dark:bg-[#1b1530] p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 animate-bounce">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black text-purple-600 uppercase">Đơn mới chờ xác nhận!</div>
            <div className="text-sm font-black truncate text-slate-900 dark:text-white">
              {banner.name} • {Number(banner.amount || 0).toLocaleString('vi-VN')}đ
            </div>
          </div>
          <Link
            href={`/order/${banner.id}`}
            onClick={() => setBanner(null)}
            className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-black shrink-0"
          >
            Xem
          </Link>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="p-1 text-slate-400 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
