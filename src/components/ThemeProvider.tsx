'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'sky' | 'mint' | 'peach' | 'lavender' | 'mono';
export type ModeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'sky',
  setTheme: () => {},
  mode: 'system',
  setMode: () => {},
  resolvedMode: 'light'
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('sky');
  const [mode, setModeState] = useState<ModeType>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('gdvnc_theme') as ThemeType;
    if (savedTheme && ['sky', 'mint', 'peach', 'lavender', 'mono'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'sky');
    }

    const savedMode = localStorage.getItem('gdvnc_mode') as ModeType;
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setModeState(savedMode);
    }
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let actualMode: 'light' | 'dark' = 'light';
    if (mode === 'system') {
      actualMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualMode = mode;
    }
    
    setResolvedMode(actualMode);
    
    if (actualMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || mode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newActualMode = e.matches ? 'dark' : 'light';
      setResolvedMode(newActualMode);
      if (newActualMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, mounted]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('gdvnc_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setMode = (newMode: ModeType) => {
    setModeState(newMode);
    localStorage.setItem('gdvnc_mode', newMode);
  };

  if (!mounted) {
    return <div className="min-h-screen invisible">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
