'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyCustomThemeVars,
  removeCustomThemeVars,
  getStoredCustomThemeConfig,
} from '@/lib/customTheme';

export type RegularThemeType = 'sky' | 'mint' | 'peach' | 'lavender' | 'mono' | 'sakura' | 'custom';
export type SpecialThemeType = 'glitch';
export type ThemeType = RegularThemeType | SpecialThemeType;

export const REGULAR_THEMES: RegularThemeType[] = ['sky', 'mint', 'peach', 'lavender', 'mono', 'sakura', 'custom'];
export const SPECIAL_THEMES: SpecialThemeType[] = ['glitch'];
export const THEMES: ThemeType[] = [...REGULAR_THEMES, ...SPECIAL_THEMES];
export type ModeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  resolvedMode: 'light' | 'dark';
  setOverrideTheme: (theme: ThemeType | null) => void;
  setOverrideMode: (mode: ModeType | null) => void;
}

// THEMES exported above
const MODES: ModeType[] = ['light', 'dark', 'system'];
const RGB_VARS = ['--accent', '--accent-hover', '--accent-bg', '--accent-text', '--accent-fg'] as const;

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'sky',
  setTheme: () => {},
  mode: 'system',
  setMode: () => {},
  setOverrideTheme: () => {},
  setOverrideMode: () => {},
  resolvedMode: 'light',
});

function applyTheme(theme: ThemeType, mode: ModeType): 'light' | 'dark' {
  const dark =
    theme === 'glitch' ||
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== theme) {
    root.setAttribute('data-theme', theme);
  }
  root.classList.toggle('dark', dark);
  root.classList.toggle('gdvn-rgb', theme === 'mint' || theme === 'peach');
  root.classList.toggle('gdvn-glitch', theme === 'glitch');
  return dark ? 'dark' : 'light';
}

function clearRgbVars(root: HTMLElement) {
  for (const name of RGB_VARS) root.style.removeProperty(name);
  root.style.removeProperty('--glitch-hue');
  root.style.removeProperty('--glitch-alt');
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
  const [overrideTheme, setOverrideTheme] = useState<ThemeType | null>(null);
  const effectiveTheme = overrideTheme || theme;
  const [mode, setModeState] = useState<ModeType>('system');
  const [overrideMode, setOverrideMode] = useState<ModeType | null>(null);
  const effectiveMode = overrideMode || mode;
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
    if (effectiveMode !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedMode(applyTheme(effectiveTheme, 'system'));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [effectiveMode, effectiveTheme]);

  useEffect(() => {
    setResolvedMode(applyTheme(effectiveTheme, effectiveMode));
  }, [effectiveTheme, effectiveMode]);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = effectiveTheme === 'mint' || effectiveTheme === 'peach';
    if (!rgb) {
      clearRgbVars(root);
      return;
    }
    const dark = resolvedMode === 'dark';
    const speed = effectiveTheme === 'peach' ? 22.5 : 30;
    let hue = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      hue = (hue + speed * dt) % 360;
      paintRgb(root, effectiveTheme as 'mint' | 'peach', dark, hue);
      raf = requestAnimationFrame(tick);
    };
    paintRgb(root, effectiveTheme as 'mint' | 'peach', dark, hue);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearRgbVars(root);
    };
  }, [effectiveTheme, resolvedMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme !== 'custom') {
      removeCustomThemeVars(root);
      root.style.removeProperty('--border-angle');
      root.style.removeProperty('--glow-ox');
      root.style.removeProperty('--glow-oy');
      return;
    }

    const updateCustomTheme = () => {
      const config = getStoredCustomThemeConfig();
      applyCustomThemeVars(root, config, resolvedMode === 'dark');
    };

    updateCustomTheme();

    let rafId = 0;
    let angle = 0;
    let last = performance.now();
    const speed = 60; // 60 deg/sec = 6s full 360 deg rotation

    const startBorderLoop = () => {
      cancelAnimationFrame(rafId);
      const config = getStoredCustomThemeConfig();
      if (config.borderAnimation === false) {
        root.style.setProperty('--border-angle', '0deg');
        const staticAngle = (config.syncGlowWithBorder ? config.angle : config.borderGlowAngle) ?? 135;
        const staticRad = (staticAngle * Math.PI) / 180;
        root.style.setProperty('--glow-ox', `${(Math.sin(staticRad) * 8).toFixed(1)}px`);
        root.style.setProperty('--glow-oy', `${(-Math.cos(staticRad) * 8).toFixed(1)}px`);
        return;
      }
      last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        angle = (angle + speed * dt) % 360;
        root.style.setProperty('--border-angle', `${angle.toFixed(1)}deg`);

        const rad = (angle * Math.PI) / 180;
        const ox = (Math.sin(rad) * 8).toFixed(2);
        const oy = (-Math.cos(rad) * 8).toFixed(2);
        root.style.setProperty('--glow-ox', `${ox}px`);
        root.style.setProperty('--glow-oy', `${oy}px`);

        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    startBorderLoop();

    const handleUserUpdate = () => {
      // Chỉ cập nhật cấu hình theme tùy biến/hiệu ứng viền, tuyệt đối KHÔNG tự ý ghi đè gdvnc_theme cá nhân
      updateCustomTheme();
      startBorderLoop();
    };

    window.addEventListener('gdvnc_user_update', handleUserUpdate);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('gdvnc_user_update', handleUserUpdate);
      removeCustomThemeVars(root);
      root.style.removeProperty('--border-angle');
      root.style.removeProperty('--glow-ox');
      root.style.removeProperty('--glow-oy');
    };
  }, [effectiveTheme, resolvedMode]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('gdvnc_theme', newTheme);
    setResolvedMode(applyTheme(newTheme, mode));
  };

  const setMode = (newMode: ModeType) => {
    setModeState(newMode);
    localStorage.setItem('gdvnc_mode', newMode);
    setResolvedMode(applyTheme(effectiveTheme, newMode));
  };

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, setTheme, mode, setMode, resolvedMode, setOverrideTheme, setOverrideMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);





