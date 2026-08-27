'use client';

import React from 'react';
import { type DictKey } from '@/lib/dictionaries';

export default function ReviewStatusBadge({
  status,
  t,
}: {
  status: string;
  t: (key: DictKey) => string;
}) {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  return (
    <span
      className="px-2 py-0.5 rounded font-black text-[10px] uppercase"
      style={
        isApproved
          ? { backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }
          : isRejected
            ? { backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }
            : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }
      }
    >
      {isApproved ? t('admin.status_approved') : isRejected ? t('admin.status_rejected') : t('admin.status_pending')}
    </span>
  );
}
