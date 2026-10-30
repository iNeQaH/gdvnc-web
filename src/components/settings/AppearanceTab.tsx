'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, ThemeType, ModeType, REGULAR_THEMES, SPECIAL_THEMES } from '@/components/ThemeProvider';
import { useLanguage } from '@/components/LanguageContext';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Cloud,
  Flower2,
  Rainbow,
  Blend,
  Sparkles,
  Check,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface AppearanceTabProps {
  currentUser: any;
}

export default function AppearanceTab({ currentUser }: AppearanceTabProps) {
  const { t, language } = useLanguage();
  const { theme, setTheme, mode, setMode } = useTheme();

  const isSupporter = Boolean(
    currentUser?.supporterUntil && new Date(currentUser.supporterUntil) > new Date()
  );
  const isSuperAdmin =
    currentUser?.role === 'ADMIN' ||
    (currentUser?.username && currentUser.username.toLowerCase() === 'ineqah');
  const canUseSupporterTheme = isSupporter || isSuperAdmin;

  const ownedThemes: string[] = Array.isArray(currentUser?.ownedThemes)
    ? currentUser.ownedThemes
    : [];
  if (currentUser?.hasGlitchTheme && !ownedThemes.includes('glitch')) {
    ownedThemes.push('glitch');
  }

  const customColors = currentUser?.profileConfig?.customThemeColors;
  const customAngle = currentUser?.profileConfig?.customThemeAngle ?? 135;
  const customGradient =
    Array.isArray(customColors) && customColors.length > 1
      ? `linear-gradient(${customAngle}deg, ${customColors.join(', ')})`
      : undefined;

  const MODES: { id: ModeType; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('theme.light') || 'Sáng', icon: Sun },
    { id: 'dark', label: t('theme.dark') || 'Tối', icon: Moon },
    { id: 'system', label: t('theme.system') || 'Hệ thống', icon: Monitor },
  ];

  const REGULAR_THEME_LIST = [
    { id: 'sky' as ThemeType, label: t('theme.sky') || 'Sky', icon: Cloud, color: 'bg-sky-500' },
    { id: 'sakura' as ThemeType, label: t('theme.sakura') || 'Sakura', icon: Flower2, color: 'bg-pink-400' },
    { id: 'mono' as ThemeType, label: 'Mono', icon: Palette, color: 'bg-zinc-500' },
    { id: 'mint' as ThemeType, label: t('theme.mint') || 'RGB', icon: Rainbow, color: 'gdvn-swatch-rgb', supporterOnly: true },
    {
      id: 'custom' as ThemeType,
      label: t('theme.custom') || 'Custom',
      icon: Blend,
      color: '',
      customColor: currentUser?.profileConfig?.customThemeColor || '#0ea5e9',
      customStyle: customGradient ? { background: customGradient } : undefined,
      supporterOnly: true,
    },
    { id: 'lavender' as ThemeType, label: 'iNeQaH', icon: Sparkles, color: 'bg-purple-500', supporterOnly: true },
  ];

  // Danh sách các theme đặc biệt ĐÃ SỞ HỮU
  const SPECIAL_THEME_LIST = [
    ...(ownedThemes.includes('glitch') || isSuperAdmin
      ? [
          {
            id: 'glitch' as ThemeType,
            label: '??? (Glitch)',
            icon: Sparkles,
            color: 'gdvn-swatch-glitch',
            meta: { tagline: 'Secret • Glitch • Easter Egg' },
          },
        ]
      : []),
  ];

  const handleSelectTheme = (id: ThemeType, supporterOnly?: boolean) => {
    if (supporterOnly && !canUseSupporterTheme) {
      window.location.href = '/support';
      return;
    }
    setTheme(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Thông báo phân định rõ ràng */}
      <div
        className="p-4 rounded-2xl border flex items-start gap-3"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-ui)',
        }}
      >
        <Palette className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div className="text-xs space-y-1">
          <p className="font-bold ui-title">
            {language === 'en' ? 'Client Theme Display' : 'Giao Diện Duyệt Web Của Bạn'}
          </p>
          <p className="ui-dim leading-relaxed">
            {language === 'en'
              ? 'These settings change how GDVN looks on your browser only. It does NOT affect your public profile page.'
              : 'Tùy chọn tại đây chỉ áp dụng cho giao diện hiển thị trên trình duyệt của riêng bạn khi lướt web. Cài đặt này KHÔNG thay đổi giao diện hồ sơ cá nhân của bạn.'}
          </p>
        </div>
      </div>

      {/* Mode Card */}
      <div className="ui-card p-6 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-bold flex items-center gap-2 ui-title">
            <Sun className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            {language === 'en' ? 'Color Mode' : 'Chế Độ Sáng / Tối'}
          </h2>
          <p className="text-xs ui-dim mt-0.5">
            {language === 'en'
              ? 'Select light mode, dark mode, or follow your system settings.'
              : 'Chọn nền sáng, nền tối hoặc tự động đồng bộ theo hệ điều hành.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => {
            const MIcon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'border-2 font-bold shadow-md'
                    : 'border hover:brightness-105'
                }`}
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border-ui)',
                  backgroundColor: active ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                  color: active ? 'var(--accent-text)' : 'var(--text-title)',
                }}
              >
                <MIcon className="w-5 h-5" style={{ color: active ? 'var(--accent)' : undefined }} />
                <span className="text-xs font-semibold">{m.label}</span>
                {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Regular Themes Card */}
      <div className="ui-card p-6 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-bold flex items-center gap-2 ui-title">
            <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            {language === 'en' ? 'Standard Themes' : 'Giao Diện Cơ Bản'}
          </h2>
          <p className="text-xs ui-dim mt-0.5">
            {language === 'en'
              ? 'Classic themes available for all GDVN members.'
              : 'Bộ sưu tập giao diện tiêu chuẩn cho mọi thành viên GDVN.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REGULAR_THEME_LIST.map((item) => {
            const isSelected = item.id === theme;
            const TIcon = item.icon;
            const isLocked = item.supporterOnly && !canUseSupporterTheme;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTheme(item.id, item.supporterOnly)}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-2 font-bold shadow-md'
                    : 'border hover:brightness-105'
                }`}
                style={{
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)',
                  backgroundColor: isSelected ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                  color: isSelected ? 'var(--accent-text)' : 'var(--text-title)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${item.color}`}
                    style={
                      item.customStyle ||
                      (item.customColor ? { backgroundColor: item.customColor } : undefined)
                    }
                  />
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                </div>
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                ) : isSelected ? (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Themes Card */}
      <div className="ui-card p-6 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2 text-amber-500">
              <Sparkles className="w-4 h-4" />
              {language === 'en' ? 'Special Themes' : 'Giao Diện Đặc Biệt'}
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {SPECIAL_THEME_LIST.length} {language === 'en' ? 'Unlocked' : 'Đã Sở Hữu'}
            </span>
          </div>
          <p className="text-xs ui-dim mt-0.5">
            {language === 'en'
              ? 'Exclusive themes unlocked via Redeem Codes or special events.'
              : 'Giao diện độc quyền được mở khóa thông qua Mã Đổi Thưởng (Redeem Code) hoặc sự kiện đặc biệt.'}
          </p>
        </div>

        {SPECIAL_THEME_LIST.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-amber-400 opacity-60" />
            <p className="text-xs font-bold ui-title">
              {language === 'en' ? 'No Special Themes Unlocked Yet' : 'Bạn Chưa Sở Hữu Giao Diện Đặc Biệt Nào'}
            </p>
            <p className="text-[11px] ui-dim max-w-sm mx-auto">
              {language === 'en'
                ? 'Enter a special Redeem Code in the General tab to unlock exclusive themes!'
                : 'Nhập mã quà tặng đặc biệt tại tab Chung để mở khóa các giao diện độc quyền!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_THEME_LIST.map((item) => {
              const isSelected = item.id === theme;
              const TIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 font-bold shadow-md ring-2 ring-amber-500/20'
                      : 'border hover:brightness-105'
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)',
                    backgroundColor: isSelected ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                    color: isSelected ? 'var(--accent-text)' : 'var(--text-title)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-4 h-4 rounded-full shrink-0 ${item.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <TIcon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </div>
                      {item.meta?.tagline && (
                        <div className="text-[10px] ui-dim truncate mt-0.5">
                          {item.meta.tagline}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
