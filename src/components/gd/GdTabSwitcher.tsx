'use client';

import React from 'react';
import { useGdTheme } from '@/hooks/useGdTheme';

export interface TabItem<T extends string> {
  key: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface GdTabSwitcherProps<T extends string> {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export default function GdTabSwitcher<T extends string>({
  tabs,
  activeKey,
  onChange,
  className = '',
}: GdTabSwitcherProps<T>) {
  const isGdTheme = useGdTheme();

  if (!isGdTheme) {
    return (
      <div
        className={`flex items-center gap-1.5 p-1 rounded-2xl border ${className}`}
        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // GD Texture Pack tabs for Lavender theme
  return (
    <div className={`flex items-center gap-1 p-1 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="relative px-4 py-2 text-xs font-black tracking-wide transition-all cursor-pointer select-none active:scale-95 hover:scale-105 shrink-0"
            style={{
              backgroundImage: `url(${active ? '/assets/tsumiki/GJ_tabOn_001.png' : '/assets/tsumiki/GJ_tabOff_001.png'})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              color: active ? '#ffffff' : '#d8b4fe',
              textShadow: active ? '0 1.5px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(0,0,0,0.6)',
              filter: active ? 'drop-shadow(0 2px 4px rgba(168,85,247,0.4))' : 'none',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
