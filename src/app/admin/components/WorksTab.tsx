
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, 
  RefreshCw,
  X,
  Play,
  Check,
  ChevronDown
} from 'lucide-react';
import BadgeIcon from '@/components/BadgeIcon';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { type DictKey } from '@/lib/dictionaries';
import ReviewStatusBadge from '@/components/ReviewStatusBadge';
import { gdNamesEqual } from '@/lib/gdName';
import MediaExpandEmbed, { WorkImageEmbeds } from '@/components/MediaExpandEmbed';
import GdLevelMeta from '@/components/GdLevelMeta';
import BadgePickerModal from '@/components/BadgePickerModal';


type QueueStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type QueueCounts = { pending: number; approved: number; rejected: number };

function QueueStatusFilters({
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
    <div className="flex items-center gap-1 p-0.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
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

function queueFilterTotal(counts: QueueCounts, filter: QueueStatus) {
  if (filter === 'ALL') return counts.pending + counts.approved + counts.rejected;
  if (filter === 'PENDING') return counts.pending;
  if (filter === 'APPROVED') return counts.approved;
  return counts.rejected;
}

type ReviewDecision = 'APPROVE' | 'REJECT' | null;

function toggleReviewDecision(current: ReviewDecision, next: 'APPROVE' | 'REJECT'): ReviewDecision {
  if (current === next) return null;
  return next;
}

function ReviewDecisionToggles({
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

function decisionCount(map: Record<string, ReviewDecision>) {
  return Object.values(map).filter((v) => v === 'APPROVE' || v === 'REJECT').length;
}

function setDecisionInMap(
  prev: Record<string, ReviewDecision>,
  id: string,
  value: ReviewDecision
) {
  const next = { ...prev };
  if (!value) delete next[id];
  else next[id] = value;
  return next;
}

function AdminListPager({
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

function FnSection({
  title,
  icon,
  desc,
  children,
  danger,
}: {
  title: string;
  icon: React.ReactNode;
  desc?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="ui-card transition-colors overflow-hidden"
      style={danger ? { borderColor: 'rgba(220, 38, 38, 0.45)' } : undefined}
    >
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left cursor-pointer transition-colors"
        style={{ backgroundColor: open ? 'var(--bg-subtle)' : 'transparent' }}
      >
        <div className="space-y-1">
          <h3 className="font-bold text-sm ui-title flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {desc && !open ? <p className="text-xs ui-dim line-clamp-1 opacity-70">{desc}</p> : null}
        </div>
        <ChevronDown className={`w-4 h-4 ui-dim transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="p-4 pt-0 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
          {desc ? <p className="text-xs ui-dim leading-relaxed pt-3">{desc}</p> : null}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}

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



export default function WorksTab({ currentUser, badgesList }: { currentUser: any, badgesList: any[] }) {
  const { t, language } = useLanguage();
  const { showToast, showConfirm } = useToast();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [workDecisions, setWorkDecisions] = useState<Record<string, ReviewDecision>>({});
  const [levelSubDecisions, setLevelSubDecisions] = useState<Record<string, ReviewDecision>>({});

// Works moderation state
  const [pendingWorks, setPendingWorks] = useState<any[]>([]);
  const [levelSubs, setLevelSubs] = useState<any[]>([]);
  const [workFilter, setWorkFilter] = useState<QueueStatus>('PENDING');
  const [workPage, setWorkPage] = useState(1);
  const [workQuery, setWorkQuery] = useState('');
  const [workSort, setWorkSort] = useState<'newest' | 'oldest'>('newest');
  const [workChallengeFilter, setWorkChallengeFilter] = useState<'ALL' | 'CHALLENGE' | 'NON_CHALLENGE'>('ALL');
  const [workCounts, setWorkCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [workReviewData, setWorkReviewData] = useState<Record<string, { badgeIds?: string[], cpAwarded?: string, rejectReason?: string }>>({});
  const [badgePickerWorkId, setBadgePickerWorkId] = useState<string | null>(null);

  
const [pendingLevelSubs, setPendingLevelSubs] = useState<any[]>([]);
  const [levelSubFilter, setLevelSubFilter] = useState<QueueStatus>('PENDING');
  const [levelSubPage, setLevelSubPage] = useState(1);
  const [levelSubCounts, setLevelSubCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingLevelSubs, setLoadingLevelSubs] = useState(true);

  

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorks(workFilter, 1);
      fetchLevelSubs(levelSubFilter, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [workQuery, workSort, workChallengeFilter]);

const fetchWorks = async (
    status: QueueStatus = workFilter,
    page = 1,
    q = workQuery,
    sort = workSort,
    challengeFilter = workChallengeFilter
  ) => {
    setLoadingWorks(true);
    setLoadingLevelSubs(true);
    try {
      const challengeParam = challengeFilter === 'CHALLENGE' ? '&isChallenge=true' : challengeFilter === 'NON_CHALLENGE' ? '&isChallenge=false' : '';
      const [wRes, lRes] = await Promise.all([
        fetch(`/api/admin/works?status=${status}&page=${page}&q=${encodeURIComponent(q)}&sort=${sort}${challengeParam}`),
        fetch(`/api/admin/level-submissions?status=${status}&page=${page}${challengeParam}`)
      ]);
      const data = await wRes.json();
      const lData = await lRes.json();
      if (data.success) {
        setPendingWorks(data.works || []);
        if (data.counts) setWorkCounts(data.counts);
        setWorkPage(data.page || page);
      }
      if (lData.success) {
        setLevelSubs(lData.submissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWorks(false);
      setLoadingLevelSubs(false);
    }
  };


const fetchLevelSubs = async (status: QueueStatus = levelSubFilter, page = 1) => {
    setLoadingLevelSubs(true);
    try {
      const res = await fetch(`/api/admin/level-submissions?status=${status}&page=${page}`);
      const data = await res.json();
      if (data.success) {
        setPendingLevelSubs(data.submissions || []);
        if (data.counts) setLevelSubCounts(data.counts);
        setLevelSubPage(data.page || page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevelSubs(false);
    }
  };


const handleReviewWork = async (workId: string, action: 'APPROVE' | 'REJECT') => {
    const data = workReviewData[workId] || {};
    setActionLoading(workId);
    try {
      const selectedBadges = data.badgeIds || [];
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          badgeId: selectedBadges.join(','),
          cpAwarded: data.cpAwarded || '0',
          rejectReason: (data.rejectReason || '').trim() || (action === 'REJECT' ? 'Không đạt quy chuẩn Creator' : ''),
          reviewerId: currentUser?.id,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        return true;
      }
      showToast(resData.error || 'Lỗi duyệt Work', 'error');
      return false;
    } catch (e) {
      showToast('Lỗi kết nối server', 'error');
      return false;
    } finally {
      setActionLoading(null);
    }
  };


const handleReviewLevelSub = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/level-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectReason: (rejectReason[id] || '').trim() || (action === 'REJECT' ? t('admin.default_reject') : ''),
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


const confirmWorkReviews = async () => {
    const workEntries = Object.entries(workDecisions).filter(([, a]) => a === 'APPROVE' || a === 'REJECT') as Array<[string, 'APPROVE' | 'REJECT']>;
    const subEntries = Object.entries(levelSubDecisions).filter(([, a]) => a === 'APPROVE' || a === 'REJECT') as Array<[string, 'APPROVE' | 'REJECT']>;
    if (workEntries.length === 0 && subEntries.length === 0) return;
    setBulkConfirming(true);
    let ok = 0;
    for (const [id, action] of workEntries) {
      if (await handleReviewWork(id, action)) ok++;
    }
    for (const [id, action] of subEntries) {
      if (await handleReviewLevelSub(id, action)) ok++;
    }
    setWorkDecisions({});
    setLevelSubDecisions({});
    await Promise.all([fetchWorks(workFilter, workPage), fetchLevelSubs(workFilter, workPage)]);
    setBulkConfirming(false);
    if (ok > 0) showToast(t('common.confirm') + `: ${ok}`, 'success');
  };



  const creatorCounts = {
    pending: workCounts.pending + levelSubCounts.pending,
    approved: workCounts.approved + levelSubCounts.approved,
    rejected: workCounts.rejected + levelSubCounts.rejected,
  };

  const creatorQueue = [
    ...pendingWorks.map((item) => ({ kind: 'work' as const, at: item.submittedAt, item })),
    ...pendingLevelSubs.map((item) => ({ kind: 'sub' as const, at: item.submittedAt, item })),
  ].sort((a, b) => {
    const da = new Date(a.at || 0).getTime();
    const db = new Date(b.at || 0).getTime();
    return workSort === 'newest' ? db - da : da - db;
  });

  const creatorDecisionCount = decisionCount(workDecisions) + decisionCount(levelSubDecisions);

  return (
    <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ui-title">
            <div className="flex items-center gap-2">
              <span>{t('admin.creator_queue', { n: queueFilterTotal(creatorCounts, workFilter) })}</span>
              <button
                type="button"
                disabled={bulkConfirming || creatorDecisionCount === 0}
                onClick={confirmWorkReviews}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                {t('common.confirm')}
                {creatorDecisionCount > 0 ? ` (${creatorDecisionCount})` : ''}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <QueueStatusFilters
                value={workFilter}
                counts={creatorCounts}
                onChange={(status) => {
                  setWorkFilter(status);
                  setLevelSubFilter(status);
                  setWorkPage(1);
                  setLevelSubPage(1);
                  setWorkDecisions({});
                  setLevelSubDecisions({});
                  fetchWorks(status, 1);
                  fetchLevelSubs(status, 1);
                }}
                t={t}
              />
              <button
                onClick={() => {
                  fetchWorks(workFilter, workPage);
                  fetchLevelSubs(workFilter, workPage);
                }}
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
                value={workQuery}
                onChange={(e) => setWorkQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={workChallengeFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setWorkChallengeFilter(val);
                  fetchWorks(workFilter, 1, workQuery, workSort, val);
                }}
                className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="ALL">Tất cả Tag</option>
                <option value="CHALLENGE">Có tag Challenge</option>
                <option value="NON_CHALLENGE">Không có Challenge</option>
              </select>

              <select
                value={workSort}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setWorkSort(val);
                  fetchWorks(workFilter, workPage, workQuery, val, workChallengeFilter);
                }}
                className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </div>
          </div>

          {loadingWorks || loadingLevelSubs ? (
            <div className="p-8 text-center ui-dim text-xs">{t('admin.loading')}</div>
          ) : creatorQueue.length === 0 ? (
            <div className="ui-card p-8 text-center space-y-1">
              <div className="font-bold ui-title text-xs">{t('admin.queue_empty')}</div>
              <div className="text-[11px] ui-dim">{t('admin.creator_empty')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {creatorQueue.map((entry) => {
                if (entry.kind === 'work') {
                  const work = entry.item;
                  return (
                <div key={`work-${work.id}`} className="ui-card p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-2.5">
                      <Link href={`/profile/${work.user.username}`} className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                        {work.user.avatarUrl ? (
                          <img src={work.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          work.user.username[0]
                        )}
                      </Link>
                      <div>
                        <Link href={`/profile/${work.user.username}`} className="font-bold ui-title text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                          {work.user.gdUsername || work.user.username}
                        </Link>
                        <div className="text-[11px] ui-dim">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-500/15 text-violet-500 border border-violet-500/25 mr-1.5">Tác phẩm</span>
                          {work.levelName || 'Untitled'} {work.gdLevelId ? `(ID: ${work.gdLevelId})` : ''}
                          {work.username ? ` · GD: ${work.username}` : ''}
                          {work.submittedAt ? ` · ${new Date(work.submittedAt).toLocaleString()}` : ''}
                        </div>
                        <div className="mt-1.5">
                          <GdLevelMeta
                            gdLevelId={work.gdLevelId}
                            linked={work.linkedLevel || {
                              name: work.levelName,
                              difficultyFace: work.difficultyFace,
                              ratingType: work.ratingType,
                              mode: work.mode,
                              isVN: work.isVN,
                              isChallenge: work.isChallenge,
                              placement: work.placement,
                              vnPlacement: work.vnPlacement,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReviewStatusBadge status={work.status} t={t} />
                      <ReviewerLine item={work} t={t} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {work.videoUrl ? (
                      <MediaExpandEmbed
                        url={work.videoUrl}
                        label="Video"
                        expandLabel={t('admin.expand_media')}
                        collapseLabel={t('admin.collapse_media')}
                      />
                    ) : null}
                    {work.imageUrl && work.status === 'PENDING' ? (
                      <WorkImageEmbeds
                        imageUrl={work.imageUrl}
                        label="Ảnh"
                        expandLabel={t('admin.expand_media')}
                        collapseLabel={t('admin.collapse_media')}
                      />
                    ) : null}
                  </div>

                  {work.description && (
                    <div className="p-2.5 rounded-xl ui-subtle text-[11px] ui-dim">
                      <span className="font-semibold ui-title">Mô tả:</span> "{work.description}"
                    </div>
                  )}

                  {work.status === 'REJECTED' && work.rejectReason && (
                    <div className="p-2.5 rounded-xl text-[11px]" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      <span className="font-semibold">{t('admin.reject')}:</span> {work.rejectReason}
                    </div>
                  )}
                  {work.status === 'APPROVED' && work.rejectReason && (
                    <div className="p-2.5 rounded-xl text-[11px] bg-emerald-500/10 text-emerald-500">
                      <span className="font-semibold">{t('admin.review_note')}:</span> {work.rejectReason}
                    </div>
                  )}

                  {work.status === 'APPROVED' && (work.badgeGranted || work.cpGranted) && (
                    <div className="p-2.5 rounded-xl text-[11px] ui-subtle ui-dim">
                      {work.badgeGranted ? <span>Badge: {work.badgeGranted}</span> : null}
                      {work.cpGranted ? <span>{work.badgeGranted ? ' · ' : ''}CP: {work.cpGranted}</span> : null}
                    </div>
                  )}

                  {work.status === 'PENDING' && (
                  <div className="pt-2 flex flex-col gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    {gdNamesEqual(work.username, work.user?.gdUsername) ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBadgePickerWorkId(work.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      >
                        {t('admin.assign_badges')}
                        {(workReviewData[work.id]?.badgeIds || []).length > 0
                          ? ` (${(workReviewData[work.id]?.badgeIds || []).length})`
                          : ''}
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {badgesList
                          .filter((b: any) => (workReviewData[work.id]?.badgeIds || []).includes(b.id))
                          .map((b: any) => (
                            <BadgeIcon
                              key={b.id}
                              icon={b.icon || 'Star'}
                              color={b.color}
                              glow={b.glowColor}
                              className="w-5 h-5"
                              title={b.name}
                            />
                          ))}
                      </div>
                      <input
                        type="number"
                        placeholder="CP (+)"
                        value={workReviewData[work.id]?.cpAwarded || ''}
                        onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], cpAwarded: e.target.value } })}
                        className="w-20 px-2 py-1.5 rounded-xl text-xs border focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                        title="Cộng CP thủ công (huy hiệu không cộng điểm)"
                      />
                    </div>
                    ) : (
                      <p className="text-[11px] ui-dim">GD username nộp không trùng profile — không trao huy hiệu / CP.</p>
                    )}
                    <input
                      type="text"
                      placeholder={t('admin.review_note_ph')}
                      value={workReviewData[work.id]?.rejectReason || ''}
                      onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], rejectReason: e.target.value } })}
                      className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                    <div className="flex justify-end">
                      <ReviewDecisionToggles
                        value={workDecisions[work.id] || null}
                        onChange={(v) => setWorkDecisions((prev) => setDecisionInMap(prev, work.id, v))}
                        t={t}
                        disabled={bulkConfirming}
                      />
                    </div>
                  </div>
                  )}
                </div>
                  );
                }
                const sub = entry.item;
                return (
                <div key={`sub-${sub.id}`} className="ui-card p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-2.5">
                      <Link href={`/profile/${sub.user?.username}`} className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                        {sub.user?.avatarUrl ? (
                          <img src={sub.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          sub.user?.username?.[0] || 'L'
                        )}
                      </Link>
                      <div>
                        <Link href={`/profile/${sub.user?.username}`} className="font-bold ui-title text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                          {sub.user?.gdUsername || sub.user?.username}
                        </Link>
                        <div className="text-[11px] ui-dim">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/15 text-sky-500 border border-sky-500/25 mr-1.5">Submit Level</span>
                          GD ID {sub.gdLevelId} · {sub.mode} {sub.placement ? `· #${sub.placement}` : '· Unranked'} {sub.isVN ? `· VN${sub.vnPlacement ? ` #${sub.vnPlacement}` : ''}` : ''}
                          {sub.isChallenge ? ' · Challenge' : ''}
                          {sub.submittedAt ? ` · ${new Date(sub.submittedAt).toLocaleString()}` : ''}
                        </div>
                        <div className="mt-1.5">
                          <GdLevelMeta
                            gdLevelId={sub.gdLevelId}
                            linked={{
                              difficultyFace: sub.difficultyFace,
                              ratingType: sub.ratingType,
                              mode: sub.mode,
                              isVN: sub.isVN,
                              isChallenge: sub.isChallenge,
                              placement: sub.placement,
                              vnPlacement: sub.vnPlacement,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReviewStatusBadge status={sub.status} t={t} />
                      <ReviewerLine item={sub} t={t} />
                    </div>
                  </div>
                  {sub.videoUrl ? (
                    <MediaExpandEmbed
                      url={sub.videoUrl}
                      label="Video"
                      expandLabel={t('admin.expand_media')}
                      collapseLabel={t('admin.collapse_media')}
                    />
                  ) : null}
                  {sub.status === 'REJECTED' && sub.rejectReason && (
                    <div className="p-2.5 rounded-xl text-[11px]" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      <span className="font-semibold">{t('admin.reject')}:</span> {sub.rejectReason}
                    </div>
                  )}
                  {sub.status === 'APPROVED' && sub.rejectReason && (
                    <div className="p-2.5 rounded-xl text-[11px] bg-emerald-500/10 text-emerald-500">
                      <span className="font-semibold">{t('admin.review_note')}:</span> {sub.rejectReason}
                    </div>
                  )}
                  {sub.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      placeholder={t('admin.review_note_ph')}
                      value={rejectReason[sub.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [sub.id]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                    <ReviewDecisionToggles
                      value={levelSubDecisions[sub.id] || null}
                      onChange={(v) => setLevelSubDecisions((prev) => setDecisionInMap(prev, sub.id, v))}
                      t={t}
                      disabled={bulkConfirming}
                    />
                  </div>
                  )}
                </div>
                );
              })}
              <AdminListPager
                page={workPage}
                total={queueFilterTotal(creatorCounts, workFilter)}
                onPage={(p) => {
                  setWorkDecisions({});
                  setLevelSubDecisions({});
                  fetchWorks(workFilter, p);
                  fetchLevelSubs(workFilter, p);
                }}
                t={t}
              />
            </div>
          )}
          <BadgePickerModal
            isOpen={!!badgePickerWorkId}
            onClose={() => setBadgePickerWorkId(null)}
            badges={badgesList}
            selectedIds={badgePickerWorkId ? (workReviewData[badgePickerWorkId]?.badgeIds || []) : []}
            onConfirm={(ids) => {
              if (badgePickerWorkId) {
                setWorkReviewData((prev) => ({
                  ...prev,
                  [badgePickerWorkId]: { ...prev[badgePickerWorkId], badgeIds: ids },
                }));
              }
              setBadgePickerWorkId(null);
            }}
          />
        </div>
  );
}
