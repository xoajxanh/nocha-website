'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDesktopSidebarOpen: boolean;
  toggleDesktopSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDesktopSidebarOpen: true,
  toggleDesktopSidebar: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('nocha_theme') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      setThemeState(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      setThemeState('light');
      document.documentElement.classList.remove('dark');
    }

    const savedSidebar = localStorage.getItem('nocha_sidebar_open');
    if (savedSidebar === 'false') {
      setIsDesktopSidebarOpen(false);
    }
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('nocha_theme', mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('nocha_sidebar_open', String(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDesktopSidebarOpen,
        toggleDesktopSidebar,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Chuyển sang Giao diện Tối (Dịu mắt)' : 'Chuyển sang Giao diện Sáng Matcha'}
      aria-label={theme === 'light' ? 'Chuyển sang Giao diện Tối' : 'Chuyển sang Giao diện Sáng'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all shrink-0 ${
        theme === 'light'
          ? 'bg-matcha-100 hover:bg-matcha-200 text-matcha-800 border-matcha-300'
          : 'bg-matcha-900/80 hover:bg-matcha-800 text-matcha-200 border-matcha-700'
      } ${className}`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-matcha-700 shrink-0" />
      ) : (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      )}
    </button>
  );
}
