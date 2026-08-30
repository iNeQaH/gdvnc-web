'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeType, ModeType } from './ThemeProvider';
import { Palette, ChevronDown, Check, Sun, Moon, Leaf, Monitor, Cloud, Sparkles, Flower2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export const ThemeSwitcher = () => {
  const { t } = useLanguage();
  const { theme, setTheme, mode, setMode, resolvedMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!mounted) return null;

  const MODES: { id: ModeType; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('theme.light'), icon: Sun },
    { id: 'dark', label: t('theme.dark'), icon: Moon },
    { id: 'system', label: t('theme.system'), icon: Monitor },
  ];

  const THEMES: { id: ThemeType; label: string; icon: typeof Sun; color: string }[] = [
    { id: 'sky', label: 'Sky (Default)', icon: Cloud, color: 'bg-sky-500' },
    { id: 'mint', label: t('theme.mint'), icon: Leaf, color: 'bg-emerald-500' },
    { id: 'peach', label: t('theme.peach'), icon: Sun, color: 'bg-orange-500' },
    { id: 'lavender', label: t('theme.lavender'), icon: Sparkles, color: 'bg-purple-500' },
    { id: 'sakura', label: t('theme.sakura'), icon: Flower2, color: 'bg-pink-400' },
    { id: 'mono', label: 'Mono', icon: Palette, color: 'bg-zinc-500' },
  ];

  const currentTheme = THEMES.find((item) => item.id === theme) || THEMES[0];
  const ThemeIcon = currentTheme.icon;
  const ModeIcon = mode === 'system' ? Monitor : mode === 'dark' ? Moon : Sun;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-1.5 w-full px-2.5 h-9 rounded-xl border text-[11px] font-bold font-sans leading-none cursor-pointer focus:outline-none min-w-0 max-w-full transition-colors appearance-none"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-ui)',
          color: 'var(--text-title)',
          WebkitAppearance: 'none',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ModeIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate leading-none">{currentTheme.label}</span>
        </div>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-2xl py-1.5 z-[100] text-xs backdrop-blur-md sm:top-auto sm:bottom-full sm:mt-0 sm:mb-2"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          {/* Mode Switcher */}
          <div className="px-3 pb-1 mb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider ui-dim mb-1">
              Mode
            </div>
            <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
              {MODES.map(m => {
                const MIcon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex-1 flex justify-center py-1 rounded-md transition-colors ${active ? 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white' : 'ui-dim hover:opacity-100'}`}
                    title={m.label}
                  >
                    <MIcon className="w-3.5 h-3.5" />
                  </button>
                )
              })}
            </div>
          </div>

          <div
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider ui-dim"
          >
            {t('theme.pick')}
          </div>
          {THEMES.map((item) => {
            const isSelected = item.id === theme;
            const TIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center justify-between transition-colors hover:opacity-80 cursor-pointer"
                style={{
                  color: 'var(--text-title)',
                  backgroundColor: isSelected ? 'var(--bg-subtle)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`}></span>
                  <TIcon className="w-3.5 h-3.5" />
                  <span className={isSelected ? 'font-bold' : 'font-normal'}>{item.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
