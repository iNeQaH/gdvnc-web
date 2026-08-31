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
const RGB_VARS = ['--accent', '--accent-hover', '--accent-bg', '--accent-text', '--accent-fg'] as const;

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
  root.classList.toggle('gdvn-rgb', theme === 'mint' || theme === 'peach');
  return dark ? 'dark' : 'light';
}

function clearRgbVars(root: HTMLElement) {
  for (const name of RGB_VARS) root.style.removeProperty(name);
}

function paintRgb(root: HTMLElement, theme: 'mint' | 'peach', dark: boolean, hue: number) {
  const h = ((hue % 360) + 360) % 360;
  const pastel = theme === 'peach';
  const s = pastel ? (dark ? 48 : 52) : dark ? 82 : 88;
  const l = pastel ? (dark ? 74 : 64) : dark ? 62 : 48;
  const hoverL = pastel ? l + (dark ? 8 : -8) : l + (dark ? 8 : -8);
  const bgS = pastel ? (dark ? 32 : 58) : dark ? 48 : 90;
  const bgL = pastel ? (dark ? 26 : 93) : dark ? 22 : 92;
  const textS = pastel ? (dark ? 52 : 44) : dark ? 85 : 78;
  const textL = pastel ? (dark ? 88 : 36) : dark ? 84 : 30;
  root.style.setProperty('--accent', `hsl(${h}, ${s}%, ${l}%)`);
  root.style.setProperty('--accent-hover', `hsl(${h}, ${s}%, ${hoverL}%)`);
  root.style.setProperty('--accent-bg', `hsl(${h}, ${bgS}%, ${bgL}%)`);
  root.style.setProperty('--accent-text', `hsl(${h}, ${textS}%, ${textL}%)`);
  root.style.setProperty('--accent-fg', dark && !pastel ? '#0a0a0a' : '#ffffff');
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

  useEffect(() => {
    const root = document.documentElement;
    const rgb = theme === 'mint' || theme === 'peach';
    if (!rgb) {
      clearRgbVars(root);
      return;
    }
    const dark = resolvedMode === 'dark';
    // RGB / RGB Pastel are an explicit color-cycle choice — keep moving even if
    // the OS has "reduce motion" on (Windows often maps that to a frozen accent).
    const speed = theme === 'peach' ? 22.5 : 30;
    let hue = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      hue = (hue + speed * dt) % 360;
      paintRgb(root, theme, dark, hue);
      raf = requestAnimationFrame(tick);
    };
    paintRgb(root, theme, dark, hue);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearRgbVars(root);
    };
  }, [theme, resolvedMode]);

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
