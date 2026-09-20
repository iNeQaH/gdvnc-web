'use client';

import React from 'react';
import { useGdTheme } from '@/hooks/useGdTheme';

export interface GdCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

export default function GdCheckbox({
  checked,
  onChange,
  label,
  className = '',
}: GdCheckboxProps) {
  const isGdTheme = useGdTheme();

  if (!isGdTheme) {
    return (
      <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold ${className}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded accent-purple-500 cursor-pointer"
        />
        {label && <span>{label}</span>}
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 cursor-pointer select-none text-xs font-black active:scale-95 transition-transform ${className}`}
    >
      <span
        className="w-6 h-6 inline-block shrink-0 transition-all"
        style={{
          backgroundImage: `url(${checked ? '/assets/tsumiki/GJ_checkOn_001.png' : '/assets/tsumiki/GJ_checkOff_001.png'})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          filter: checked ? 'drop-shadow(0 0 4px rgba(168,85,247,0.6))' : 'none',
        }}
      />
      {label && <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)', color: '#ffffff' }}>{label}</span>}
    </button>
  );
}
