'use client';

import React from 'react';
import { type DictKey } from '@/lib/dictionaries';

export type QueueStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type QueueCounts = { pending: number; approved: number; rejected: number };
export type ReviewDecision = 'APPROVE' | 'REJECT' | null;

export function QueueStatusFilters({
  value,
  counts,
  onChange,
  t,
}: {
  value: QueueStatus;
  counts: QueueCounts;
  onChange: (status: QueueStatus) => void;
  t: (key: DictKey) => string;
}) {
  const all = counts.pending + counts.approved + counts.rejected;
  const items: Array<[QueueStatus, DictKey, number]> = [
    ['PENDING', 'admin.filter_pending', counts.pending],
    ['APPROVED', 'admin.filter_approved', counts.approved],
    ['REJECTED', 'admin.filter_rejected', counts.rejected],
    ['ALL', 'admin.filter_all', all],
  ];
  return (
    <div
      className="flex items-center gap-1 p-0.5 rounded-xl border"
      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
    >
      {items.map(([status, label, count]) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
          style={{
            backgroundColor: value === status ? 'var(--bg-card)' : 'transparent',
            color: value === status ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {t(label)} ({count})
        </button>
      ))}
    </div>
  );
}

export function queueFilterTotal(counts: QueueCounts, filter: QueueStatus) {
  if (filter === 'ALL') return counts.pending + counts.approved + counts.rejected;
  if (filter === 'PENDING') return counts.pending;
  if (filter === 'APPROVED') return counts.approved;
  return counts.rejected;
}

export function toggleReviewDecision(current: ReviewDecision, next: 'APPROVE' | 'REJECT'): ReviewDecision {
  if (current === next) return null;
  return next;
}

export function ReviewDecisionToggles({
  value,
  onChange,
  t,
  disabled,
}: {
  value: ReviewDecision;
  onChange: (v: ReviewDecision) => void;
  t: (key: DictKey) => string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(toggleReviewDecision(value, 'REJECT'))}
        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all disabled:opacity-50"
        style={
          value === 'REJECT'
            ? { backgroundColor: 'var(--badge-red-text)', color: '#fff', borderColor: 'transparent' }
            : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)', borderColor: 'var(--border-ui)' }
        }
      >
        {t('admin.reject')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(toggleReviewDecision(value, 'APPROVE'))}
        className="px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all disabled:opacity-50"
        style={
          value === 'APPROVE'
            ? { backgroundColor: 'var(--badge-green-text)', color: '#fff', borderColor: 'transparent' }
            : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)', borderColor: 'var(--border-ui)' }
        }
      >
        {t('admin.approve')}
      </button>
    </div>
  );
}

export function decisionCount(map: Record<string, ReviewDecision>) {
  return Object.values(map).filter((v) => v === 'APPROVE' || v === 'REJECT').length;
}

export function setDecisionInMap(
  prev: Record<string, ReviewDecision>,
  id: string,
  value: ReviewDecision
) {
  const next = { ...prev };
  if (!value) delete next[id];
  else next[id] = value;
  return next;
}
