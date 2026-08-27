'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'sky' | 'mint' | 'peach' | 'lavender' | 'mono' | 'sakura';
export type ModeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  resolvedMode: 'light' | 'dark';
}

const THEMES: ThemeType[] = ['sky', 'mint', 'peach', 'lavender', 'mono', 'sakura'];
const MODES: ModeType[] = ['light', 'dark', 'system'];

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'sky',
  setTheme: () => {},
  mode: 'system',
  setMode: () => {},
  resolvedMode: 'light',
});

function applyTheme(theme: ThemeType, mode: ModeType): 'light' | 'dark' {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== theme) {
    root.setAttribute('data-theme', theme);
  }
  root.classList.toggle('dark', dark);
  return dark ? 'dark' : 'light';
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('sky');
  const [mode, setModeState] = useState<ModeType>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('gdvnc_theme') as ThemeType;
    const nextTheme = THEMES.includes(savedTheme) ? savedTheme : 'sky';
    const savedMode = localStorage.getItem('gdvnc_mode') as ModeType;
    const nextMode = MODES.includes(savedMode) ? savedMode : 'system';
    setThemeState(nextTheme);
    setModeState(nextMode);
    setResolvedMode(applyTheme(nextTheme, nextMode));
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedMode(applyTheme(theme, 'system'));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('gdvnc_theme', newTheme);
    setResolvedMode(applyTheme(newTheme, mode));
  };

  const setMode = (newMode: ModeType) => {
    setModeState(newMode);
    localStorage.setItem('gdvnc_mode', newMode);
    setResolvedMode(applyTheme(theme, newMode));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
