'use client';

import React from 'react';
import { type DictKey } from '@/lib/dictionaries';

export function UserAvatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name?: string | null;
  className: string;
}) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const src = url?.trim();
  if (src) {
    return <img src={src} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div
      className={`${className} flex items-center justify-center font-bold text-[color:var(--accent-fg)]`}
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {letter}
    </div>
  );
}

export function AdminListPager({
  page,
  total,
  onPage,
  t,
  pageSize = 10,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  pageSize?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 rounded-xl text-[11px] font-bold border disabled:opacity-40 cursor-pointer"
        style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
      >
        {t('admin.prev')}
      </button>
      <span className="text-[11px] ui-dim font-semibold">{t('admin.page_of', { n: page, total: pages })}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 rounded-xl text-[11px] font-bold border disabled:opacity-40 cursor-pointer"
        style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
      >
        {t('admin.next')}
      </button>
    </div>
  );
}
