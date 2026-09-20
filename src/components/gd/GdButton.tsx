'use client';

import React from 'react';
import { useGdTheme } from '@/hooks/useGdTheme';

export interface GdButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'confirm' | 'danger' | 'secondary' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function GdButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  style = {},
  disabled,
  ...props
}: GdButtonProps) {
  const isGdTheme = useGdTheme();

  if (!isGdTheme) {
    // Standard fallback UI button
    const bgMap = {
      primary: 'var(--accent)',
      confirm: 'var(--badge-green-text)',
      danger: '#ef4444',
      secondary: 'var(--bg-subtle)',
      gold: '#f59e0b',
    };
    const colorMap = {
      primary: 'var(--accent-fg)',
      confirm: '#ffffff',
      danger: '#ffffff',
      secondary: 'var(--text-title)',
      gold: '#ffffff',
    };
    return (
      <button
        disabled={disabled}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${className}`}
        style={{
          backgroundColor: bgMap[variant],
          color: colorMap[variant],
          borderColor: variant === 'secondary' ? 'var(--border-ui)' : 'transparent',
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    );
  }

  // GD Texture Pack button rendering for Lavender theme
  const spriteMap = {
    primary: '/gd-assets/btn-purple.png',
    confirm: '/gd-assets/btn-green.png',
    danger: '/gd-assets/btn-red.png',
    secondary: '/gd-assets/btn-gray.png',
    gold: '/gd-assets/btn-gold.png',
  };

  const sizePadding = {
    sm: 'px-3 py-1 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      disabled={disabled}
      className={`relative inline-flex items-center justify-center font-black tracking-wide transition-all cursor-pointer select-none active:scale-95 hover:scale-105 disabled:opacity-40 disabled:pointer-events-none ${sizePadding[size]} ${className}`}
      style={{
        backgroundImage: `url(${spriteMap[variant]})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        color: '#ffffff',
        textShadow: '0 1.5px 3px rgba(0,0,0,0.8)',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        ...style,
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-1.5 drop-shadow">
        {children}
      </span>
    </button>
  );
}
