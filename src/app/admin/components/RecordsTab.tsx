'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  RefreshCw, 
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { type DictKey } from '@/lib/dictionaries';
import ReviewStatusBadge from '@/components/ReviewStatusBadge';
import MediaExpandEmbed from '@/components/MediaExpandEmbed';
import {
  QueueStatusFilters,
  queueFilterTotal,
  ReviewDecisionToggles,
  decisionCount,
  setDecisionInMap,
  type QueueStatus,
  type QueueCounts,
  type ReviewDecision,
} from './AdminQueueShared';
import { AdminListPager } from './SharedUI';

function ReviewerLine({
  item,
  t,
}: {
  item: {
    status: string;
    reviewerName?: string | null;
    reviewer?: { username?: string | null; gdUsername?: string | null } | null;
  };
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  if (item.status !== 'APPROVED' && item.status !== 'REJECTED') return null;
  const name =
    (item.reviewerName || '').trim() ||
    (item.reviewer?.username || '').trim() ||
    (item.reviewer?.gdUsername || '').trim() ||
    '—';
  return (
    <div className="text-[10px] ui-dim">
      {t('admin.reviewed_by', { name })}
    </div>
  );
}

export default function RecordsTab({
  currentUser,
  onPendingCountChange,
}: {
  currentUser: any;
  onPendingCountChange?: (count: number) => void;
}) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [recordFilter, setRecordFilter] = useState<QueueStatus>('PENDING');
  const [recordPage, setRecordPage] = useState(1);
  const [recordQuery, setRecordQuery] = useState('');
  const [recordSort, setRecordSort] = useState<'newest' | 'oldest'>('newest');
  const [recordRole, setRecordRole] = useState('ALL');
  const [recordCounts, setRecordCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});

  const [recordDecisions, setRecordDecisions] = useState<Record<string, ReviewDecision>>({});
  const [bulkConfirming, setBulkConfirming] = useState(false);

  const fetchPendingRecords = async (status: QueueStatus = recordFilter, page = 1) => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/records/pending?status=${status}&page=${page}&q=${encodeURIComponent(recordQuery)}&sort=${recordSort}&role=${recordRole}`);
      const data = await res.json();
      if (data.success) {
        setPendingRecords(data.records || []);
        if (data.counts) {
          setRecordCounts(data.counts);
          onPendingCountChange?.(data.counts.pending || 0);
        }
        setRecordPage(data.page || page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchPendingRecords('PENDING', 1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingRecords(recordFilter, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [recordQuery, recordSort, recordRole]);

  const handleReview = async (recordId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(recordId);
    try {
      const res = await fetch(`/api/admin/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectReason: (rejectReason[recordId] || '').trim() || (action === 'REJECT' ? t('admin.default_reject') : ''),
          reviewerId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        return true;
      }
      showToast(data.error || t('admin.action_fail'), 'error');
      return false;
    } catch (e) {
      showToast(t('common.server_error'), 'error');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const confirmRecordReviews = async () => {
    const entries = Object.entries(recordDecisions).filter(([, a]) => a === 'APPROVE' || a === 'REJECT') as Array<[string, 'APPROVE' | 'REJECT']>;
    if (entries.length === 0) return;
    setBulkConfirming(true);
    let ok = 0;
    for (const [id, action] of entries) {
      if (await handleReview(id, action)) ok++;
    }
    setRecordDecisions({});
    await fetchPendingRecords(recordFilter, recordPage);
    setBulkConfirming(false);
    if (ok > 0) showToast(t('common.confirm') + `: ${ok}`, 'success');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ui-title">
        <div className="flex items-center gap-2">
          <span>{t('admin.queue_title', { n: queueFilterTotal(recordCounts, recordFilter) })}</span>
          <button
            type="button"
            disabled={bulkConfirming || decisionCount(recordDecisions) === 0}
            onClick={confirmRecordReviews}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {t('common.confirm')}
            {decisionCount(recordDecisions) > 0 ? ` (${decisionCount(recordDecisions)})` : ''}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QueueStatusFilters
            value={recordFilter}
            counts={recordCounts}
            onChange={(status) => {
              setRecordFilter(status);
              setRecordPage(1);
              setRecordDecisions({});
              fetchPendingRecords(status, 1);
            }}
            t={t}
          />
          <button
            onClick={() => fetchPendingRecords(recordFilter, recordPage)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold ui-dim hover:opacity-100 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> {t('admin.refresh')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.search_user')}
            value={recordQuery}
            onChange={(e) => setRecordQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={recordSort}
            onChange={(e) => setRecordSort(e.target.value as any)}
            className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
          <select
            value={recordRole}
            onChange={(e) => setRecordRole(e.target.value)}
            className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <option value="ALL">{t('admin.filter_all')}</option>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="SUPPORTER">Supporter</option>
            <option value="USER">{t('admin.filter_user')}</option>
          </select>
        </div>
      </div>

      {loadingRecords ? (
        <div className="p-8 text-center ui-dim text-xs">{t('admin.loading')}</div>
      ) : pendingRecords.length === 0 ? (
        <div className="ui-card p-8 text-center space-y-1">
          <div className="font-bold ui-title text-xs">{t('admin.queue_empty')}</div>
          <div className="text-[11px] ui-dim">{t('admin.queue_empty_hint')}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRecords.map((rec) => (
            <div
              key={rec.id}
              className="ui-card p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2.5">
                  {rec.user ? (
                    <Link href={`/profile/${rec.user.username}`} className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                      {rec.user.avatarUrl ? (
                        <img src={rec.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        rec.user.gdUsername?.[0] || rec.user.username[0]
                      )}
                    </Link>
                  ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                      {(rec.legacyPlayerName || '?')[0]}
                    </div>
                  )}
                  <div>
                    {rec.user ? (
                      <Link href={`/profile/${rec.user.username}`} className="font-bold ui-title text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                        {rec.user.gdUsername || rec.user.username}
                      </Link>
                    ) : (
                      <div className="font-bold ui-title text-xs">
                        {rec.legacyPlayerName || t('levelslist.legacy_player')}
                        <span className="ml-1.5 text-[9px] font-bold uppercase ui-dim">{t('levelslist.unclaimed')}</span>
                      </div>
                    )}
                    <div className="text-[11px] ui-dim">
                      {t('admin.level_label', { name: rec.level.name, placement: rec.level.placement || '-', mode: rec.level.mode })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 text-xs">
                  <ReviewStatusBadge status={rec.status} t={t} />
                  <ReviewerLine item={rec} t={t} />
                  {rec.progress && (
                    <span className="px-2 py-0.5 rounded font-black text-xs" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      {rec.progress}%
                    </span>
                  )}
                  {rec.timeMs && (
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
                      {(rec.timeMs / 1000).toFixed(3)}s
                    </span>
                  )}
                  {rec.hz && (
                    <span className="px-2 py-0.5 rounded ui-subtle font-semibold text-[10px] ui-dim">
                      {rec.hz}Hz " {rec.fps ? `${rec.fps} FPS " ` : ''}{rec.device || 'PC'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <MediaExpandEmbed
                  url={rec.videoUrl}
                  label="Video"
                  expandLabel={t('admin.expand_media')}
                  collapseLabel={t('admin.collapse_media')}
                />
                {rec.rawProofUrl ? (
                  <MediaExpandEmbed
                    url={rec.rawProofUrl}
                    label="Raw Footage"
                    expandLabel={t('admin.expand_media')}
                    collapseLabel={t('admin.collapse_media')}
                  />
                ) : null}
              </div>

              {rec.comment && (
                <div className="p-2.5 rounded-xl ui-subtle text-[11px] ui-dim">
                  <span className="font-semibold ui-title">{t('admin.comment')}</span> "{rec.comment}"
                </div>
              )}

              {rec.status === 'REJECTED' && rec.rejectReason && (
                <div className="p-2.5 rounded-xl text-[11px]" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                  <span className="font-semibold">{t('admin.reject')}:</span> {rec.rejectReason}
                </div>
              )}
              {rec.status === 'APPROVED' && rec.rejectReason && (
                <div className="p-2.5 rounded-xl text-[11px] bg-emerald-500/10 text-emerald-500">
                  <span className="font-semibold">{t('admin.review_note')}:</span> {rec.rejectReason}
                </div>
              )}

              {rec.status === 'PENDING' && (
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder={t('admin.review_note_ph')}
                  value={rejectReason[rec.id] || ''}
                  onChange={(e) => setRejectReason({ ...rejectReason, [rec.id]: e.target.value })}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
                <ReviewDecisionToggles
                  value={recordDecisions[rec.id] || null}
                  onChange={(v) => setRecordDecisions((prev) => setDecisionInMap(prev, rec.id, v))}
                  t={t}
                  disabled={bulkConfirming}
                />
              </div>
              )}
            </div>
          ))}
          <AdminListPager
            page={recordPage}
            total={queueFilterTotal(recordCounts, recordFilter)}
            onPage={(p) => {
              setRecordDecisions({});
              fetchPendingRecords(recordFilter, p);
            }}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
