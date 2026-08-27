'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Trash2, 
  Check, 
  X, 
  Play, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  Search, 
  UserCheck,
  SlidersHorizontal,
  Crown,
  User as UserIcon,
  CheckCircle2,
  Calendar,
  Clock,
  LayoutGrid,
  List,
  Heart,
  Shield,
  Star,
  Trophy,
  Award,
  Zap,
  Flame,
  Diamond,
  Medal,
  StarHalf,
  ChevronDown,
  ChevronUp,
  Layers,
  FolderPlus
} from 'lucide-react';
import * as AllLucideIcons from 'lucide-react';
import { CUSTOM_ICONS } from '@/components/CustomIcons';

// Kết hợp cả icon của Lucide và icon tuỳ chỉnh của bạn
const allIconNames = [
  ...Object.keys(CUSTOM_ICONS),
  ...Object.keys(AllLucideIcons).filter(name => /^[A-Z]/.test(name) && name !== 'LucideProps' && name !== 'IconNode')
];

const IconRender = ({ icon, className }: { icon: string, className?: string }) => {
  // Ưu tiên tìm trong CUSTOM_ICONS trước, nếu không có mới tìm trong AllLucideIcons
  const Comp = (CUSTOM_ICONS as any)[icon] || (AllLucideIcons as any)[icon] || AllLucideIcons.Star;
  return <Comp className={className} />;
};

import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { type DictKey } from '@/lib/dictionaries';
import ReviewStatusBadge from '@/components/ReviewStatusBadge';

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

function ReviewerLine({ item, t }: { item: { status: string; reviewer?: { username?: string } | null }; t: (key: DictKey, vars?: Record<string, string | number>) => string }) {
  if (item.status !== 'APPROVED' && item.status !== 'REJECTED') return null;
  return (
    <div className="text-[10px] ui-dim">
      {t('admin.reviewed_by', { name: item.reviewer?.username || '—' })}
    </div>
  );
}

import LevelFormModal from '@/components/LevelFormModal';
import { formatCp, getDecoBadgeCp, getLayoutBadgeCp, isDecoCategory, isLayoutCategory } from '@/lib/creatorPoints';

export default function AdminPage() {
  const { t, language } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tab, setTabState] = useState<'records' | 'works' | 'badges' | 'users' | 'levels' | 'levelSubs' | 'helps'>('records');
  
  useEffect(() => {
    const saved = localStorage.getItem('adminTab');
    if (saved) setTabState(saved as any);
  }, []);

  const setTab = (t: any) => {
    setTabState(t);
    localStorage.setItem('adminTab', t);
  };

  // Record moderation state
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [recordFilter, setRecordFilter] = useState<QueueStatus>('PENDING');
  const [recordCounts, setRecordCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});

  // Works moderation state
  const [pendingWorks, setPendingWorks] = useState<any[]>([]);
  const [workFilter, setWorkFilter] = useState<QueueStatus>('PENDING');
  const [workCounts, setWorkCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [workReviewData, setWorkReviewData] = useState<Record<string, { decoBadgeId?: string, layoutBadgeId?: string, cpAwarded?: string, rejectReason?: string }>>({});

  // Badges state
  const [badgesList, setBadgesList] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const emptyBadgeForm = { imageUrl: '', id: '', name: '', description: '', color: '', glow: false, categoryId: '', sortOrder: '' };
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [badgeCategories, setBadgeCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [badgeSearch, setBadgeSearch] = useState('');
  const [badgeFilterCategory, setBadgeFilterCategory] = useState('ALL');
  const [badgeSort, setBadgeSort] = useState<'quality' | 'name' | 'category'>('quality');
  const [badgesViewMode, setBadgesViewMode] = useState<'list' | 'grid'>('list');
  const [isBadgeEditMode, setIsBadgeEditMode] = useState(false);
  const [isBadgeEditModalOpen, setIsBadgeEditModalOpen] = useState(false);
  const [draggedBadgeId, setDraggedBadgeId] = useState<string | null>(null);
  const [pendingLevelSubs, setPendingLevelSubs] = useState<any[]>([]);
  const [levelSubFilter, setLevelSubFilter] = useState<QueueStatus>('PENDING');
  const [levelSubCounts, setLevelSubCounts] = useState<QueueCounts>({ pending: 0, approved: 0, rejected: 0 });
  const [loadingLevelSubs, setLoadingLevelSubs] = useState(true);

  // User management state
  const [userQuery, setUserQuery] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [isLevelFormOpen, setIsLevelFormOpen] = useState(false);
  const [levelFormInitialData, setLevelFormInitialData] = useState<any>(null);
  const [adminToast, setAdminToast] = useState<{ text: string, isError: boolean } | null>(null);
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userViewMode, setUserViewMode] = useState<'list' | 'grid'>('list');
  const [userPage, setUserPage] = useState(1);

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
      } catch (e) {}
    }
    fetchPendingRecords('PENDING');
    fetchUsers('');
    fetchWorks('PENDING');
    fetchBadges();
    fetchBadgeCategories();
    fetchLevelSubs('PENDING');
  }, []);

  const fetchWorks = async (status: QueueStatus = workFilter) => {
    setLoadingWorks(true);
    try {
      const res = await fetch(`/api/admin/works?status=${status}`);
      const data = await res.json();
      if (data.success) {
        setPendingWorks(data.works || []);
        if (data.counts) setWorkCounts(data.counts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWorks(false);
    }
  };

  const fetchBadges = async () => {
    setLoadingBadges(true);
    try {
      const res = await fetch('/api/admin/badges');
      const data = await res.json();
      if (data.success) setBadgesList(data.badges || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBadges(false);
    }
  };

  const fetchBadgeCategories = async () => {
    try {
      const res = await fetch('/api/admin/badge-categories');
      const data = await res.json();
      if (data.success) setBadgeCategories(data.categories || []);
    } catch (e) {}
  };

  const fetchLevelSubs = async (status: QueueStatus = levelSubFilter) => {
    setLoadingLevelSubs(true);
    try {
      const res = await fetch(`/api/admin/level-submissions?status=${status}`);
      const data = await res.json();
      if (data.success) {
        setPendingLevelSubs(data.submissions || []);
        if (data.counts) setLevelSubCounts(data.counts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevelSubs(false);
    }
  };

  const decoBadges = badgesList
    .filter((b) => isDecoCategory(b))
    .sort((a, b) => (getDecoBadgeCp(b.name) || 0) - (getDecoBadgeCp(a.name) || 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const layoutBadges = badgesList
    .filter((b) => isLayoutCategory(b))
    .sort((a, b) => (getLayoutBadgeCp(b.name) || 0) - (getLayoutBadgeCp(a.name) || 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const fetchPendingRecords = async (status: QueueStatus = recordFilter) => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/records/pending?status=${status}`);
      const data = await res.json();
      if (data.success) {
        setPendingRecords(data.records || []);
        if (data.counts) setRecordCounts(data.counts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchUsers = async (q: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleReview = async (recordId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(recordId);
    try {
      const res = await fetch(`/api/admin/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectReason: rejectReason[recordId] || t('admin.default_reject'),
          reviewerId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        setPendingRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  status: nextStatus,
                  rejectReason: action === 'REJECT' ? rejectReason[recordId] || t('admin.default_reject') : r.rejectReason,
                  reviewedAt: new Date().toISOString(),
                }
              : r
          )
        );
        setRecordCounts((c) => ({
          pending: Math.max(0, c.pending - 1),
          approved: c.approved + (action === 'APPROVE' ? 1 : 0),
          rejected: c.rejected + (action === 'REJECT' ? 1 : 0),
        }));
      } else {
        showToast(data.error || t('admin.action_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewWork = async (workId: string, action: 'APPROVE' | 'REJECT') => {
    const data = workReviewData[workId] || {};
    setActionLoading(workId);
    try {
      const selectedBadges = [data.decoBadgeId, data.layoutBadgeId].filter(Boolean);
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          badgeId: selectedBadges.join(','),
          cpAwarded: data.cpAwarded || '0',
          rejectReason: data.rejectReason || 'Không đạt quy chuẩn Creator',
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        setPendingWorks((prev) =>
          prev.map((w) =>
            w.id === workId
              ? {
                  ...w,
                  ...(resData.work || {}),
                  status: nextStatus,
                  rejectReason: action === 'REJECT' ? data.rejectReason || 'Không đạt quy chuẩn Creator' : w.rejectReason,
                }
              : w
          )
        );
        setWorkCounts((c) => ({
          pending: Math.max(0, c.pending - 1),
          approved: c.approved + (action === 'APPROVE' ? 1 : 0),
          rejected: c.rejected + (action === 'REJECT' ? 1 : 0),
        }));
        showToast(action === 'APPROVE' ? 'Đã duyệt Work!' : 'Đã từ chối Work', action === 'REJECT' ? 'error' : 'success');
      } else {
        showToast(resData.error || 'Lỗi duyệt Work', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveBadge = async () => {
    setActionLoading('badge');
    try {
      const url = badgeForm.id ? `/api/admin/badges/${badgeForm.id}` : `/api/admin/badges`;
      const method = badgeForm.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badgeForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(badgeForm.id ? 'Đã cập nhật huy hiệu' : 'Đã tạo huy hiệu', 'success');
        setBadgeForm(emptyBadgeForm);
        fetchBadges();
      } else {
        showToast(data.error || 'Lỗi', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    showConfirm('Xóa huy hiệu này?', async () => {
      try {
        const res = await fetch(`/api/admin/badges/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast('Đã xóa huy hiệu', 'success');
          fetchBadges();
        }
      } catch (e) {
        showToast('Lỗi kết nối', 'error');
      }
    });
  };


  const handleMoveBadge = async (id: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (data.success && data.badges) setBadgesList(data.badges);
    } catch (e) {
      showToast('Lỗi sắp xếp huy hiệu', 'error');
    }
  };

  const handleDropBadge = async (targetId: string) => {
    if (!draggedBadgeId || draggedBadgeId === targetId) return;
    const sourceIndex = badgesList.findIndex(b => b.id === draggedBadgeId);
    const targetIndex = badgesList.findIndex(b => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newBadges = [...badgesList];
    const [movedItem] = newBadges.splice(sourceIndex, 1);
    newBadges.splice(targetIndex, 0, movedItem);
    
    setBadgesList(newBadges);
    setDraggedBadgeId(null);
    
    try {
      const orderedIds = newBadges.map(b => b.id);
      await fetch('/api/admin/badges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
      fetchBadges();
    } catch (e) {
      console.error(e);
      showToast('Lỗi cập nhật thứ tự', 'error');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/admin/badge-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName('');
        fetchBadgeCategories();
        showToast(t('badge.cat_created'), 'success');
      } else {
        showToast(data.error || t('admin.action_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    showConfirm(t('badge.cat_delete_confirm'), async () => {
      try {
        const res = await fetch(`/api/admin/badge-categories/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchBadgeCategories();
          fetchBadges();
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      }
    });
  };

  const handleReviewLevelSub = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/level-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectReason: rejectReason[id] || t('admin.default_reject'),
          reviewerId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        setPendingLevelSubs((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...(data.submission || {}),
                  status: nextStatus,
                  rejectReason: action === 'REJECT' ? rejectReason[id] || t('admin.default_reject') : s.rejectReason,
                }
              : s
          )
        );
        setLevelSubCounts((c) => ({
          pending: Math.max(0, c.pending - 1),
          approved: c.approved + (action === 'APPROVE' ? 1 : 0),
          rejected: c.rejected + (action === 'REJECT' ? 1 : 0),
        }));
        showToast(action === 'APPROVE' ? t('admin.level_sub_ok') : t('admin.level_sub_reject'), action === 'REJECT' ? 'error' : 'success');
      } else {
        showToast(data.error || t('admin.action_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBadges = badgesList
    .filter((b) => {
      const q = badgeSearch.trim().toLowerCase();
      const nameOk = !q || b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
      const catOk =
        badgeFilterCategory === 'ALL' ||
        b.categoryId === badgeFilterCategory ||
        (badgeFilterCategory === 'NONE' && !b.categoryId);
      return nameOk && catOk;
    })
    .slice()
    .sort((a, b) => {
      if (badgeSort === 'name') return a.name.localeCompare(b.name);
      if (badgeSort === 'category') {
        return (a.badgeCategory?.name || '').localeCompare(b.badgeCategory?.name || '') || (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MODERATOR' | 'SUPPORTER' | 'USER'>('ALL');
  const [userSort, setUserSort] = useState<'createdAt' | 'role' | 'pp'>('createdAt');

  useEffect(() => {
    setUserPage(1);
  }, [userQuery, roleFilter, userSort, userSortOrder]);

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
    return (
      <div className="max-w-sm mx-auto py-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
          <AlertCircle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold ui-title">{t('admin.denied_title')}</h2>
        <p className="text-xs ui-dim">
          {t('admin.denied_desc')}
        </p>
        <Link
          href="/login"
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs inline-flex" style={{ backgroundColor: 'var(--accent)' }}
        >
          {t('admin.go_login')}
        </Link>
      </div>
    );
  }

  const isSuperAdmin = currentUser.username === 'iNeQaH';

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'SUPPORTER') {
      return u.supporterUntil && new Date(u.supporterUntil) > new Date();
    }
    return u.role === roleFilter;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === 'role') {
      const roleWeight = { ADMIN: 3, MODERATOR: 2, USER: 1 };
      const weightA = roleWeight[a.role as keyof typeof roleWeight] || 0;
      const weightB = roleWeight[b.role as keyof typeof roleWeight] || 0;
      return userSortOrder === 'desc' ? weightB - weightA : weightA - weightB;
    } else if (userSort === 'pp') {
      return userSortOrder === 'desc' ? b.classicPp - a.classicPp : a.classicPp - b.classicPp;
    } else {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return userSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
  });

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="ui-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase ui-dim flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            {t('admin.system')}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold ui-title">
            {t('admin.dashboard')}
          </h1>
          <div className="text-xs ui-dim">
            {t('admin.account', { name: currentUser.username, role: isSuperAdmin ? 'Super Admin' : currentUser.role })}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl border shrink-0" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
          <button
            onClick={() => setTab('records')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'records' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'records' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            Records ({recordCounts.pending})
          </button>
          <button
            onClick={() => setTab('works')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'works' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'works' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            Works ({pendingWorks.length})
          </button>
          <button
            onClick={() => setTab('levelSubs')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'levelSubs' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'levelSubs' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('admin.tab_level_subs')} ({pendingLevelSubs.length})
          </button>
          <button
            onClick={() => setTab('badges')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'badges' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'badges' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            Badges
          </button>
          <button
            onClick={() => setTab('users')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'users' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'users' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            Members
          </button>
            <button
              onClick={() => setTab('levels')}
              className={"px-4 py-2 font-bold text-xs transition-colors " + (tab === 'levels' ? 'border-b-2' : 'ui-dim hover:opacity-100')}
              style={{ borderColor: tab === 'levels' ? 'var(--accent)' : 'transparent', color: tab === 'levels' ? 'var(--text-title)' : undefined }}
            >
              {t('admin.tab_levels')}
            </button>
            <button
              onClick={() => setTab('helps')}
              className={"px-4 py-2 font-bold text-xs transition-colors " + (tab === 'helps' ? 'border-b-2' : 'ui-dim hover:opacity-100')}
              style={{ borderColor: tab === 'helps' ? 'var(--accent)' : 'transparent', color: tab === 'helps' ? 'var(--text-title)' : undefined }}
            >
              Helps
            </button>
        </div>
      </div>

      {/* Tab 1: Record Moderation Queue */}
      {tab === 'records' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ui-title">
            <span>{t('admin.queue_title', { n: pendingRecords.length })}</span>
            <div className="flex items-center gap-2">
              <QueueStatusFilters
                value={recordFilter}
                counts={recordCounts}
                onChange={(status) => {
                  setRecordFilter(status);
                  fetchPendingRecords(status);
                }}
                t={t}
              />
              <button
                onClick={() => fetchPendingRecords(recordFilter)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold ui-dim hover:opacity-100 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> {t('admin.refresh')}
              </button>
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
                      <Link href={`/profile/${rec.user.username}`} className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                        {rec.user.avatarUrl ? (
                          <img src={rec.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          rec.user.username[0]
                        )}
                      </Link>
                      <div>
                        <Link href={`/profile/${rec.user.username}`} className="font-bold ui-title text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                          {rec.user.username}
                        </Link>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="ui-dim">Video:</span>
                      <a
                        href={rec.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold truncate hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        {rec.videoUrl}
                      </a>
                    </div>
                    {rec.rawProofUrl && (
                      <div className="flex items-center gap-1.5">
                        <span className="ui-dim">Raw Footage:</span>
                        <a
                          href={rec.rawProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold truncate hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Link Raw
                        </a>
                      </div>
                    )}
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

                  {rec.status === 'PENDING' && (
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder={t('admin.reject_ph')}
                      value={rejectReason[rec.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [rec.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={actionLoading === rec.id}
                        onClick={() => handleReview(rec.id, 'REJECT')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}
                      >
                        {t('admin.reject')}
                      </button>
                      <button
                        disabled={actionLoading === rec.id}
                        onClick={() => handleReview(rec.id, 'APPROVE')}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs"
                        style={{ backgroundColor: 'var(--badge-green-text)' }}
                      >
                        {t('admin.approve')}
                      </button>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'works' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ui-title">
            <span>{t('admin.works_queue', { n: pendingWorks.length })}</span>
            <div className="flex items-center gap-2">
              <QueueStatusFilters
                value={workFilter}
                counts={workCounts}
                onChange={(status) => {
                  setWorkFilter(status);
                  fetchWorks(status);
                }}
                t={t}
              />
              <button
                onClick={() => fetchWorks(workFilter)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold ui-dim hover:opacity-100 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> {t('admin.refresh')}
              </button>
            </div>
          </div>

          {loadingWorks ? (
            <div className="p-8 text-center ui-dim text-xs">{t('admin.loading')}</div>
          ) : pendingWorks.length === 0 ? (
            <div className="ui-card p-8 text-center space-y-1">
              <div className="font-bold ui-title text-xs">{t('admin.queue_empty')}</div>
              <div className="text-[11px] ui-dim">{t('admin.works_empty')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWorks.map((work) => (
                <div key={work.id} className="ui-card p-4 sm:p-5 space-y-3">
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
                          {work.user.username}
                        </Link>
                        <div className="text-[11px] ui-dim">
                          Tác phẩm: {work.levelName} {work.gdLevelId ? `(ID: ${work.gdLevelId})` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReviewStatusBadge status={work.status} t={t} />
                      <ReviewerLine item={work} t={t} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {work.videoUrl && (
                      <div className="flex items-center gap-1.5">
                        <span className="ui-dim">Video:</span>
                        <a href={work.videoUrl} target="_blank" rel="noreferrer" className="font-semibold truncate hover:underline" style={{ color: 'var(--accent)' }}>
                          {work.videoUrl}
                        </a>
                      </div>
                    )}
                    {work.imageUrl && (
                      <div className="flex items-center gap-1.5">
                        <span className="ui-dim">Ảnh:</span>
                        <a href={work.imageUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                          Xem Ảnh Mẫu
                        </a>
                      </div>
                    )}
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

                  {work.status === 'APPROVED' && (work.badgeGranted || work.cpGranted) && (
                    <div className="p-2.5 rounded-xl text-[11px] ui-subtle ui-dim">
                      {work.badgeGranted ? <span>Badge: {work.badgeGranted}</span> : null}
                      {work.cpGranted ? <span>{work.badgeGranted ? ' · ' : ''}CP: {work.cpGranted}</span> : null}
                    </div>
                  )}

                  {work.status === 'PENDING' && (
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <select
                          value={workReviewData[work.id]?.decoBadgeId || ''}
                          onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], decoBadgeId: e.target.value } })}
                          className="flex-1 px-2 py-1.5 rounded-xl text-xs border focus:outline-none font-sans"
                          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', fontFamily: 'inherit' }}
                        >
                          <option value="">-- Deco Badge --</option>
                          {decoBadges.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} (+{formatCp(getDecoBadgeCp(b.name) || 0)})
                            </option>
                          ))}
                        </select>
                        <select
                          value={workReviewData[work.id]?.layoutBadgeId || ''}
                          onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], layoutBadgeId: e.target.value } })}
                          className="flex-1 px-2 py-1.5 rounded-xl text-xs border focus:outline-none font-sans"
                          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', fontFamily: 'inherit' }}
                        >
                          <option value="">-- Layout Badge --</option>
                          {layoutBadges.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} (+{formatCp(getLayoutBadgeCp(b.name) || 0)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="CP (+)"
                          value={workReviewData[work.id]?.cpAwarded || ''}
                          onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], cpAwarded: e.target.value } })}
                          className="w-20 px-2 py-1.5 rounded-xl text-xs border focus:outline-none"
                          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                          title="Điểm cộng thêm cho work (ngoài điểm từ badge)"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder={t('admin.reject_ph')}
                        value={workReviewData[work.id]?.rejectReason || ''}
                        onChange={(e) => setWorkReviewData({ ...workReviewData, [work.id]: { ...workReviewData[work.id], rejectReason: e.target.value } })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mt-2 sm:mt-0">
                      <button
                        disabled={actionLoading === work.id}
                        onClick={() => handleReviewWork(work.id, 'REJECT')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}
                      >
                        {t('admin.reject')}
                      </button>
                      <button
                        disabled={actionLoading === work.id}
                        onClick={() => handleReviewWork(work.id, 'APPROVE')}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs"
                        style={{ backgroundColor: 'var(--badge-green-text)' }}
                      >
                        {t('admin.approve')}
                      </button>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

              {/* Tab Helps */}
        {tab === 'helps' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">Hỗ trợ / Helps</h2>
            <AdminHelpsTab />
          </div>
        )}

        {tab === 'levelSubs' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold ui-title">
            <span>{t('admin.level_sub_queue', { n: pendingLevelSubs.length })}</span>
            <div className="flex items-center gap-2">
              <QueueStatusFilters
                value={levelSubFilter}
                counts={levelSubCounts}
                onChange={(status) => {
                  setLevelSubFilter(status);
                  fetchLevelSubs(status);
                }}
                t={t}
              />
              <button
                onClick={() => fetchLevelSubs(levelSubFilter)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold ui-dim hover:opacity-100 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> {t('admin.refresh')}
              </button>
            </div>
          </div>
          {loadingLevelSubs ? (
            <div className="p-8 text-center ui-dim text-xs">{t('admin.loading')}</div>
          ) : pendingLevelSubs.length === 0 ? (
            <div className="ui-card p-8 text-center space-y-1">
              <div className="font-bold ui-title text-xs">{t('admin.queue_empty')}</div>
              <div className="text-[11px] ui-dim">{t('admin.level_sub_empty')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLevelSubs.map((sub) => (
                <div key={sub.id} className="ui-card p-4 sm:p-5 space-y-3">
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
                          {sub.user?.username}
                        </Link>
                        <div className="text-[11px] ui-dim">
                          GD ID {sub.gdLevelId} · {sub.mode} {sub.placement ? `· #${sub.placement}` : '· Unranked'} {sub.isVN ? '· VN' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReviewStatusBadge status={sub.status} t={t} />
                      <ReviewerLine item={sub} t={t} />
                    </div>
                  </div>
                  {sub.videoUrl && (
                    <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold truncate hover:underline block" style={{ color: 'var(--accent)' }}>
                      {sub.videoUrl}
                    </a>
                  )}
                  {sub.status === 'REJECTED' && sub.rejectReason && (
                    <div className="p-2.5 rounded-xl text-[11px]" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      <span className="font-semibold">{t('admin.reject')}:</span> {sub.rejectReason}
                    </div>
                  )}
                  {sub.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      placeholder={t('admin.reject_ph')}
                      value={rejectReason[sub.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [sub.id]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={actionLoading === sub.id}
                        onClick={() => handleReviewLevelSub(sub.id, 'REJECT')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}
                      >
                        {t('admin.reject')}
                      </button>
                      <button
                        disabled={actionLoading === sub.id}
                        onClick={() => handleReviewLevelSub(sub.id, 'APPROVE')}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs"
                        style={{ backgroundColor: 'var(--badge-green-text)' }}
                      >
                        {t('admin.approve')}
                      </button>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

            {tab === 'badges' && (
        <div className="space-y-4">
          <div className="ui-card p-5 space-y-3">
            <h3 className="font-bold text-sm ui-title">{t('badge.categories')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {badgeCategories.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border" style={{ borderColor: 'var(--border-ui)' }}>
                  {c.name}
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:opacity-80 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('badge.new_category')}
                className="ui-input px-3 py-2 rounded-xl flex-1 text-xs"
              />
              <button onClick={handleCreateCategory} className="px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] cursor-pointer inline-flex items-center gap-1" style={{ backgroundColor: 'var(--accent)' }}>
                <FolderPlus className="w-3.5 h-3.5" /> {t('badge.add_category')}
              </button>
            </div>
          </div>

          <div className="ui-card p-5 space-y-4">
            <h3 className="font-bold text-sm ui-title">Tạo Huy Hiệu Mới</h3>
            <div className="grid grid-cols-1 gap-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Tên huy hiệu" value={badgeForm.name} onChange={e => setBadgeForm({...badgeForm, name: e.target.value})} className="ui-input px-3 py-2 rounded-xl" />
                <input type="text" placeholder="Mô tả" value={badgeForm.description} onChange={e => setBadgeForm({...badgeForm, description: e.target.value})} className="ui-input px-3 py-2 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={badgeForm.categoryId}
                  onChange={(e) => setBadgeForm({ ...badgeForm, categoryId: e.target.value })}
                  className="ui-input px-3 py-2 rounded-xl"
                >
                  <option value="">{t('badge.uncategorized')}</option>
                  {badgeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <label className="text-[11px] font-bold uppercase ui-dim mb-2 block">Chọn Icon (SVG)</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsIconModalOpen(true)}
                  className="px-4 py-2 bg-[var(--bg-subtle)] border border-dashed border-[var(--border-ui)] rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-colors"
                >
                  {badgeForm.imageUrl ? (
                    <>
                      <IconRender icon={badgeForm.imageUrl} className="w-4 h-4" />
                      {badgeForm.imageUrl}
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Mở thư viện Icon
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-8">
                <div>
                  <label className="text-[11px] font-bold uppercase ui-dim mb-2 block">Màu sắc & Preview</label>
                  <div className="flex items-center gap-4">
                    <input type="color" value={badgeForm.color} onChange={e => setBadgeForm({...badgeForm, color: e.target.value})} className="w-10 h-10 rounded-full overflow-hidden p-0 cursor-pointer border-0 bg-transparent" />
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all" 
                      style={{ 
                        backgroundColor: badgeForm.color || 'var(--accent)', 
                        boxShadow: badgeForm.glow ? `0 0 15px ${badgeForm.color}` : 'none' 
                      }}
                    >
                      {badgeForm.imageUrl ? <IconRender icon={badgeForm.imageUrl} className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={badgeForm.glow} onChange={e => setBadgeForm({...badgeForm, glow: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-bold text-sm">Glow Effect (Phát sáng)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveBadge} disabled={actionLoading === 'badge'} className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs cursor-pointer" style={{ backgroundColor: 'var(--accent)' }}>
                Tạo Mới
              </button>
            </div>
          </div>

          <div className="ui-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={badgeSearch}
                  onChange={(e) => setBadgeSearch(e.target.value)}
                  placeholder={t('badge.search_name')}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
              </div>
              <select
                value={badgeFilterCategory}
                onChange={(e) => setBadgeFilterCategory(e.target.value)}
                className="px-2.5 py-2 rounded-xl border text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="ALL">{t('badge.filter_all_cats')}</option>
                <option value="NONE">{t('badge.uncategorized')}</option>
                {badgeCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={badgeSort}
                onChange={(e) => setBadgeSort(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="quality">{t('badge.sort_quality')}</option>
                <option value="name">{t('badge.sort_name')}</option>
                <option value="category">{t('badge.sort_category')}</option>
              </select>

              <button
                onClick={() => setIsBadgeEditMode(!isBadgeEditMode)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${isBadgeEditMode ? 'bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]' : 'hover:opacity-80'}`}
                style={!isBadgeEditMode ? { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' } : {}}
                title="Chế độ kéo thả"
              >
                {isBadgeEditMode ? 'Đang chỉnh sửa' : 'Chỉnh sửa (Kéo Thả)'}
              </button>
              
              <button
                onClick={() => setBadgesViewMode(badgesViewMode === 'list' ? 'grid' : 'list')}
                className="p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                title="Chuyển chế độ xem Lưới / Danh sách"
              >
                {badgesViewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            </div>

            <div className={`overflow-hidden ${badgesViewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 gap-3' : 'space-y-1'}`}>
              {loadingBadges ? (
                <div className="col-span-full p-6 text-center text-xs ui-dim">{t('admin.loading')}</div>
              ) : filteredBadges.length === 0 ? (
                <div className="col-span-full p-6 text-center text-xs ui-dim">{t('badge.none_found')}</div>
              ) : filteredBadges.map((b, idx) => (
                <div 
                  key={b.id} 
                  draggable={isBadgeEditMode}
                  onDragStart={(e) => {
                    setDraggedBadgeId(b.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isBadgeEditMode) handleDropBadge(b.id);
                  }}
                  onClick={() => {
                    if (!isBadgeEditMode) {
                      setBadgeForm({ imageUrl: b.icon || 'Star', id: b.id, name: b.name, description: b.description || '', color: b.color || '', glow: !!b.glowColor, categoryId: b.categoryId || '', sortOrder: b.sortOrder || '' });
                      setIsBadgeEditModalOpen(true);
                    }
                  }}
                  className={`flex ${badgesViewMode === 'grid' ? 'flex-col items-center justify-center text-center' : 'items-center'} gap-3 p-3 rounded-xl border ${isBadgeEditMode ? 'cursor-grab active:cursor-grabbing border-dashed border-[var(--accent)] bg-black/5 dark:bg-white/5' : 'cursor-pointer hover:scale-[1.02] hover:border-[var(--accent)] hover:shadow-md'} transition-all`} 
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: isBadgeEditMode ? 'var(--accent)' : 'var(--border-ui)' }}
                >
                  <span className="text-[10px] font-black ui-dim w-6">#{b.sortOrder || idx + 1}</span>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: b.color || 'var(--accent)', boxShadow: b.glowColor ? `0 0 10px ${b.color}` : 'none' }}>
                    <IconRender icon={b.icon || 'Star'} className="w-5 h-5 text-white" />
                  </div>
                  <div className={`min-w-0 flex-1 ${badgesViewMode === 'grid' ? 'w-full' : ''}`}>
                    <div className="font-bold ui-title text-xs truncate">{b.name}</div>
                    <div className="text-[10px] ui-dim truncate">
                      {b.badgeCategory?.name || t('badge.uncategorized')}
                      {b.description ? ` · ${b.description}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Badge Edit Modal */}
      {isBadgeEditModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsBadgeEditModalOpen(false)}>
          <div className="ui-card p-6 w-full max-w-lg overflow-y-auto max-h-[90vh] space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-bold text-base ui-title">Chỉnh sửa Huy Hiệu</h3>
              <button onClick={() => setIsBadgeEditModalOpen(false)} className="text-red-500 hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-5 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Tên huy hiệu" value={badgeForm.name} onChange={e => setBadgeForm({...badgeForm, name: e.target.value})} className="ui-input px-3 py-2 rounded-xl" />
                <input type="text" placeholder="Mô tả" value={badgeForm.description} onChange={e => setBadgeForm({...badgeForm, description: e.target.value})} className="ui-input px-3 py-2 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={badgeForm.categoryId}
                  onChange={(e) => setBadgeForm({ ...badgeForm, categoryId: e.target.value })}
                  className="ui-input px-3 py-2 rounded-xl"
                >
                  <option value="">{t('badge.uncategorized')}</option>
                  {badgeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Chèn thứ tự (Tùy chọn)" value={badgeForm.sortOrder || ''} onChange={e => setBadgeForm({...badgeForm, sortOrder: e.target.value})} className="ui-input px-3 py-2 rounded-xl" title="Thay đổi ưu tiên của huy hiệu" />
              </div>

              <label className="text-[11px] font-bold uppercase ui-dim mb-2 block">Chọn Icon (SVG)</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsIconModalOpen(true)}
                  className="px-4 py-2 bg-[var(--bg-subtle)] border border-dashed border-[var(--border-ui)] rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-colors"
                >
                  {badgeForm.imageUrl ? (
                    <>
                      <IconRender icon={badgeForm.imageUrl} className="w-4 h-4" />
                      {badgeForm.imageUrl}
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Mở thư viện Icon
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-8">
                <div>
                  <label className="text-[11px] font-bold uppercase ui-dim mb-2 block">Màu sắc & Preview</label>
                  <div className="flex items-center gap-4">
                    <input type="color" value={badgeForm.color} onChange={e => setBadgeForm({...badgeForm, color: e.target.value})} className="w-10 h-10 rounded-full overflow-hidden p-0 cursor-pointer border-0 bg-transparent" />
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all" 
                      style={{ 
                        backgroundColor: badgeForm.color || 'var(--accent)', 
                        boxShadow: badgeForm.glow ? `0 0 15px ${badgeForm.color}` : 'none' 
                      }}
                    >
                      {badgeForm.imageUrl ? <IconRender icon={badgeForm.imageUrl} className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={badgeForm.glow} onChange={e => setBadgeForm({...badgeForm, glow: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-bold text-sm">Glow Effect (Phát sáng)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-between mt-4">
              <button 
                onClick={async () => {
                  await handleSaveBadge();
                  setIsBadgeEditModalOpen(false);
                }} 
                disabled={actionLoading === 'badge'} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs cursor-pointer" 
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Lưu Thay Đổi
              </button>
              <button 
                onClick={() => {
                  if (badgeForm.id) {
                    handleDeleteBadge(badgeForm.id);
                    setIsBadgeEditModalOpen(false);
                  }
                }} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer bg-red-500 hover:bg-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}

{tab === 'levels' && (
          <div className="ui-card p-6 space-y-4">
            <p className="text-sm ui-dim">Bạn có thể quản lý, thêm hoặc cập nhật Level tại đây.</p>
            <button
              onClick={() => {
                setLevelFormInitialData(null);
                setIsLevelFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer" style={{ backgroundColor: 'var(--accent)' }}
            >
              + Thêm Level Mới
            </button>
            <p className="text-xs ui-dim">Lưu ý: Bạn cũng có thể sửa Level trực tiếp tại trang Levels.</p>
          </div>
        )}

        {tab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="space-y-3 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t('admin.search_user')}
                  value={userQuery}
                  onChange={(e) => {
                    setUserQuery(e.target.value);
                    fetchUsers(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>

              {/* Sorting Bar */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="ui-dim font-semibold">{t('admin.sort')}</span>
                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <option value="createdAt">{t('admin.sort_created')}</option>
                  <option value="role">{t('admin.sort_role')}</option>
                  <option value="pp">Classic Points</option>
                </select>
                <button
                  onClick={() => setUserSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  {userSortOrder === 'asc' ? t('admin.sort_asc') : t('admin.sort_desc')}

                </button>
                <button 
                  onClick={() => setUserViewMode(userViewMode === 'list' ? 'grid' : 'list')} 
                  className="p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  title="Toggle View Mode"
                >
                  {userViewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Role Filter Badges */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] font-bold uppercase ui-dim mr-1">{t('admin.filter_role')}</span>
              {[
                { id: 'ALL', label: t('admin.filter_all') },
                { id: 'ADMIN', label: 'Admin' },
                { id: 'MODERATOR', label: 'Moderator' },
                { id: 'SUPPORTER', label: 'Supporter' },
                { id: 'USER', label: t('admin.filter_user') },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id as any)}
                  className="px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border"
                  style={{
                    backgroundColor: roleFilter === rf.id ? 'var(--accent)' : 'var(--bg-subtle)',
                    color: roleFilter === rf.id ? 'var(--accent-fg)' : 'var(--text-dim)',
                    borderColor: roleFilter === rf.id ? 'var(--accent)' : 'var(--border-ui)',
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {loadingUsers ? (
              <div className="ui-card p-8 text-center ui-dim">{t('admin.loading_users')}</div>
            ) : sortedUsers.length === 0 ? (
              <div className="ui-card p-8 text-center ui-dim">{t('admin.no_users')}</div>
            ) : (
              <div className={userViewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "flex flex-col gap-2"}>
                {sortedUsers.slice((userPage - 1) * 10, userPage * 10).map((user) => {
                  const isTargetSuper = user.username === 'iNeQaH';
                  const isSupporter = user.supporterUntil && new Date(user.supporterUntil) > new Date();

                  return (
                    <Link
                      href={`/profile/${user.username}`}
                      key={user.id} 
                      className={`ui-card flex items-center justify-between p-3 cursor-pointer group ${userViewMode === 'grid' ? 'flex-col gap-3 text-center' : 'flex-row gap-4 hover:border-[var(--accent)] hover:shadow-md transition-all'}`}
                    >
                      {/* Left Side: Avatar and Name */}
                      <div className={`flex ${userViewMode === 'grid' ? 'flex-col items-center' : 'flex-row items-center'} gap-3 min-w-0`}>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[color:var(--accent-fg)] shrink-0 shadow-sm group-hover:scale-105 transition-transform" style={{ backgroundColor: 'var(--accent)' }}>
                            {user.username[0]}
                          </div>
                        )}
                        
                        <div className={`flex ${userViewMode === 'grid' ? 'flex-col items-center text-center' : 'flex-col items-start'} gap-1 min-w-0`}>
                          <div className={`font-bold ui-title flex items-center gap-1.5 ${userViewMode === 'grid' ? 'justify-center' : ''}`}>
                            <span className="truncate group-hover:text-[var(--accent)] transition-colors">{user.username}</span>
                          </div>
                          
                          <div className={`flex items-center gap-1.5 flex-wrap ${userViewMode === 'grid' ? 'justify-center' : ''}`}>
                            {user.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                <Crown className="w-3 h-3" /> ADMIN
                              </span>
                            )}
                            {user.role === 'MODERATOR' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                <Shield className="w-3 h-3" /> MODERATOR
                              </span>
                            )}
                            {user.role === 'USER' && !isTargetSuper && !isSupporter && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                                USER
                              </span>
                            )}
                            {isTargetSuper && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                Super Admin
                              </span>
                            )}
                            {isSupporter && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(2ec, 72, 153, 0.15)', color: '#ec4899' }}>
                                <Heart className="w-3 h-3 fill-pink-500" /> Supporter
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Action/Points */}
                      <div className={`flex ${userViewMode === 'grid' ? 'w-full flex-col' : 'shrink-0 flex-col items-end'} gap-1`}>
                        <span className="text-xs font-semibold ui-dim">
                          {user.classicPp.toFixed(1)} Pts
                        </span>
                        {isTargetSuper && (
                          <div className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-500 ${userViewMode === 'grid' ? 'w-full mt-2' : ''}`}>
                            <Crown className="w-3 h-3" /> Protected
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {sortedUsers.length > 10 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.ceil(sortedUsers.length / 10) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setUserPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${userPage === i + 1 ? 'bg-[var(--accent)] text-[color:var(--accent-fg)] shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/5 ui-dim'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast Feedback Notification */}
      {adminToast && (
        <div className="fixed bottom-5 right-5 z-[999999] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
              adminToast.isError
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}
            style={{ backdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-card)' }}
          >
            {adminToast.isError ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            <span>{adminToast.text}</span>
          </div>
        </div>
      )}
      
      {/* Icon Picker Modal */}
      {isIconModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setIsIconModalOpen(false)}>
          <div 
            className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ui-dim" />
                <input
                  type="text"
                  placeholder="Tìm kiếm SVG icon (ví dụ: Star, Heart, Shield...)"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  autoFocus
                />
              </div>
              <button 
                onClick={() => setIsIconModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 ui-dim" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 content-start">
              {allIconNames.filter(n => n.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 1500).map(iconName => (
                <button
                  key={iconName}
                  onClick={() => {
                    setBadgeForm({...badgeForm, imageUrl: iconName});
                    setIsIconModalOpen(false);
                  }}
                  title={iconName}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border hover:bg-[var(--accent)] hover:text-[color:var(--accent-fg)] hover:border-[var(--accent)] transition-colors group ui-subtle"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <IconRender icon={iconName} className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-medium truncate w-full text-center opacity-70 group-hover:opacity-100">{iconName}</span>
                </button>
              ))}
              {allIconNames.filter(n => n.toLowerCase().includes(iconSearch.toLowerCase())).length === 0 && (
                <div className="col-span-full py-8 text-center text-xs ui-dim">
                  Không tìm thấy Icon phù hợp
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <LevelFormModal
        isOpen={isLevelFormOpen}
        onClose={() => setIsLevelFormOpen(false)}
        initialData={levelFormInitialData}
        onSaved={() => {}}
      />
    </div>
  );
}




function AdminHelpsTab() {
  const [helps, setHelps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHelp, setSelectedHelp] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/helps')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHelps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá yêu cầu này?')) return;
    await fetch('/api/admin/helps', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setHelps(helps.filter(h => h.id !== id));
    setSelectedHelp(null);
  };

  if (loading) return <div>Đang tải...</div>;
  if (helps.length === 0) return <div className="text-center ui-dim">Không có yêu cầu hỗ trợ nào.</div>;

  return (
    <div className="space-y-4">
      {helps.map(h => (
        <div key={h.id} className="ui-card p-4 rounded-xl shadow-sm border flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setSelectedHelp(h)} style={{ borderColor: 'var(--border-ui)' }}>
          <div className="flex items-center gap-3">
            <Link href={`/profile/${h.user?.username}`} onClick={(e) => e.stopPropagation()}>
              <img src={h.user?.avatarUrl || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-xl object-cover hover:opacity-80" />
            </Link>
            <div>
              <Link href={`/profile/${h.user?.username}`} onClick={(e) => e.stopPropagation()} className="text-xs font-bold ui-dim hover:underline">
                {h.user?.username || 'Unknown'}
              </Link>
              <h3 className="text-sm font-black truncate max-w-[200px] sm:max-w-md">{h.title}</h3>
            </div>
          </div>
          <div className="text-xs font-bold ui-dim">
            {new Date(h.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}

      {selectedHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedHelp(null)}>
          <div className="ui-card w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedHelp(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Link href={`/profile/${selectedHelp.user?.username}`}>
                  <img src={selectedHelp.user?.avatarUrl || '/default-avatar.png'} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-md hover:opacity-80" />
                </Link>
                <Link href={`/profile/${selectedHelp.user?.username}`} className="text-sm font-black hover:underline">
                  {selectedHelp.user?.username}
                </Link>
                <div className="text-[10px] font-bold ui-dim">{new Date(selectedHelp.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <h2 className="text-xl font-black ui-title">{selectedHelp.title}</h2>
                <div className="w-full h-48 overflow-y-auto p-4 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  {selectedHelp.content}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => handleDelete(selectedHelp.id)} className="px-4 py-2 bg-red-500/10 text-red-500 font-bold text-xs rounded-xl hover:bg-red-500/20">
                    Xoá yêu cầu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
