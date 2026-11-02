'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md animate-bounce bg-white dark:bg-[#16261b] border-matcha-300 dark:border-matcha-700 max-w-sm">
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-matcha-600 dark:text-matcha-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
      )}
      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 flex-1">
        {message}
      </span>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

