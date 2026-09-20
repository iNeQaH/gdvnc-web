'use client';

import React from 'react';
import { useGdTheme } from '@/hooks/useGdTheme';

export interface GdDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function GdDialog({
  open,
  onClose,
  title,
  children,
  className = '',
}: GdDialogProps) {
  const isGdTheme = useGdTheme();

  if (!open) return null;

  if (!isGdTheme) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className={`ui-card w-full max-w-lg p-6 relative rounded-2xl ${className}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
          >
            ✕
          </button>
          {title && <h2 className="text-lg font-bold ui-title mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg p-8 shadow-2xl ${className}`}
        style={{
          borderImageSource: 'url(/assets/tsumiki/GJ_square01-uhd.png)',
          borderImageSlice: '45 fill',
          borderImageWidth: '24px',
          borderImageRepeat: 'stretch',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 cursor-pointer hover:scale-110 active:scale-95 transition-transform z-20"
          style={{
            backgroundImage: 'url(/assets/tsumiki/GJ_closeBtn_001.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {title && <h2 className="text-xl font-black tracking-wide mb-4 text-purple-200 drop-shadow">{title}</h2>}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
