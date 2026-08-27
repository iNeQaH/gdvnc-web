'use client';

import React from 'react';

export default function ColorToggle({
  pressed,
  onToggle,
  children,
  className = '',
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${className}`}
      style={
        pressed
          ? {
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
              borderColor: 'var(--accent)',
            }
          : {
              backgroundColor: 'transparent',
              color: 'var(--text-dim)',
              borderColor: 'var(--border-ui)',
            }
      }
    >
      {children}
    </button>
  );
}
