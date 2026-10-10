'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeType, ModeType } from './ThemeProvider';
import { Palette, ChevronDown, Lock, ChevronUp, Check, Sun, Moon, Monitor, Cloud, Sparkles, Flower2, Rainbow, Blend } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { isSuperAdminUser } from '@/lib/roles';

export const ThemeSwitcher = ({ dropUp = false }: { dropUp?: boolean }) => {
  const { t } = useLanguage();
  const { theme, setTheme, mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [modeIndicator, setModeIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const [themeIndicator, setThemeIndicator] = useState({ top: 0, height: 0, opacity: 0 });
  
  const modeContainerRef = useRef<HTMLDivElement>(null);
  const themeContainerRef = useRef<HTMLDivElement>(null);
  const activeModeRef = useRef<HTMLButtonElement>(null);
  const activeThemeRef = useRef<HTMLButtonElement>(null);

  const isLavender = theme === 'lavender';

  const isSupporter = currentUser?.supporterUntil && new Date(currentUser.supporterUntil) > new Date();
  const isSuperAdmin = currentUser?.role === 'ADMIN' || (currentUser?.username && currentUser.username.toLowerCase() === 'ineqah');
  const canUseLavender = isSupporter || isSuperAdmin;


  useEffect(() => {
    setMounted(true);
    const loadUser = () => {
      const userStr = localStorage.getItem('gdvnc_user');
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch(e) { setCurrentUser(null); }
      } else { setCurrentUser(null); }
    };
    loadUser();
    window.addEventListener('gdvnc_user_update', loadUser);
    return () => window.removeEventListener('gdvnc_user_update', loadUser);
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

  // Update indicators
  useEffect(() => {
    if (!open) return;
    
    // Mode indicator
    if (activeModeRef.current && modeContainerRef.current) {
      setModeIndicator({
        left: activeModeRef.current.offsetLeft,
        width: activeModeRef.current.offsetWidth,
        opacity: 1
      });
    }

    // Theme indicator
    if (activeThemeRef.current && themeContainerRef.current) {
      setThemeIndicator({
        top: activeThemeRef.current.offsetTop,
        height: activeThemeRef.current.offsetHeight,
        opacity: 1
      });
    }
  }, [open, mode, theme]);

  if (!mounted) return null;

  const MODES: { id: ModeType; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('theme.light'), icon: Sun },
    { id: 'dark', label: t('theme.dark'), icon: Moon },
    { id: 'system', label: t('theme.system'), icon: Monitor },
  ];

  const THEMES: { id: ThemeType; label: string; icon: typeof Sun; color: string }[] = [
    { id: 'sky', label: 'Sky (Default)', icon: Cloud, color: 'bg-sky-500' },
    { id: 'mint', label: t('theme.mint'), icon: Rainbow, color: 'gdvn-swatch-rgb' },
    
    { id: 'lavender', label: 'iNeQaH', icon: Sparkles, color: 'bg-purple-500' },
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
        className={`flex items-center justify-between gap-1.5 w-full px-2.5 h-9 rounded-xl border text-[11px] font-bold font-sans leading-none cursor-pointer focus:outline-none min-w-0 max-w-full transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] appearance-none ${isLavender ? (open ? 'tsumiki-btn' : 'tsumiki-btn-blue') : ''}`}
        style={{
          backgroundColor: isLavender ? undefined : 'var(--bg-subtle)',
          borderColor: isLavender ? undefined : 'var(--border-ui)',
          color: isLavender ? undefined : 'var(--text-title)',
          WebkitAppearance: 'none',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ModeIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate leading-none">{currentTheme.label}</span>
        </div>
        {dropUp ? (
          <ChevronUp className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        ) : (
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 w-48 rounded-2xl border shadow-2xl py-2 z-[100] text-xs backdrop-blur-md ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          {/* Mode Switcher */}
          <div className="px-3 pb-2 mb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider ui-dim mb-1.5">
              Mode
            </div>
            <div className="relative flex p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }} ref={modeContainerRef}>
              {isLavender && (
                <div 
                  className={`absolute top-1 bottom-1 z-[1] transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] tsumiki-indicator ${modeIndicator.opacity ? 'opacity-100' : 'opacity-0'}`}
                  style={{ 
                    left: `${modeIndicator.left}px`,
                    width: `${modeIndicator.width}px`,
                    pointerEvents: 'none'
                  }}
                >
                  <span className="tsumiki-front !rounded-lg" style={{ transform: 'translateY(-3px)' }} />
                </div>
              )}
              {MODES.map(m => {
                const MIcon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    ref={active ? activeModeRef : null}
                    onClick={() => setMode(m.id)}
                    className={`relative z-[2] flex-1 flex justify-center py-1.5 rounded-lg transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] ${active ? (isLavender ? 'text-white -translate-y-[7px]' : 'bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white') : 'ui-dim hover:opacity-100'}`}
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
          <div className="relative px-1" ref={themeContainerRef}>
            {isLavender && (
              <div 
                className={`absolute left-1 right-1 z-[1] transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] tsumiki-indicator ${themeIndicator.opacity ? 'opacity-100' : 'opacity-0'}`}
                style={{ 
                  top: `${themeIndicator.top}px`,
                  height: `${themeIndicator.height}px`,
                  pointerEvents: 'none'
                }}
              >
                <span className="tsumiki-front !rounded-xl" style={{ transform: 'translateY(-3px)' }} />
              </div>
            )}
            {THEMES.map((item) => {
              const isSelected = item.id === theme;
              const TIcon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={isSelected ? activeThemeRef : null}
                  type="button"
                  onClick={() => { if (['lavender', 'mint'].includes(item.id) && !canUseLavender) { window.location.href = '/support'; return; } setTheme(item.id); setOpen(false); if (currentUser?.username) { fetch(`/api/profile/${currentUser.username}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileTheme: item.id }) }).catch(()=>{}); } }}
                  className={`relative z-[2] w-full px-3 py-2 my-0.5 text-left flex items-center justify-between rounded-xl transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] hover:opacity-80 cursor-pointer ${isSelected && isLavender ? '-translate-y-[7px]' : ''}`}
                  style={{
                    color: isLavender && isSelected ? '#ffffff' : 'var(--text-title)',
                    backgroundColor: isLavender ? 'transparent' : (isSelected ? 'var(--bg-subtle)' : 'transparent'),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`}></span>
                    <TIcon className="w-3.5 h-3.5" />
                    <span className={isSelected ? 'font-bold' : 'font-medium'}>{item.label}</span>
                      {['lavender', 'mint'].includes(item.id) && !canUseLavender && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" style={{ color: isLavender ? '#ffffff' : 'var(--accent)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};














