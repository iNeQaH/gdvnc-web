'use client';

import React, { useEffect, useState } from 'react';
import {
  Wrench,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  Lock,
  Plus,
  Search,
  LayoutGrid,
  List,
  X,
  Gift,
  Ticket,
  Trash2,
  Copy,
  Check,
  HardDrive,
  Download,
} from 'lucide-react';
import BadgeIcon, { IconGlyph } from '@/components/BadgeIcon';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import ColorPicker from '@/components/ColorPicker';
import LevelFormModal from '@/components/LevelFormModal';
import { BADGE_ICON_NAMES } from '@/lib/badgeIconCatalog';
import { AdminListPager } from './SharedUI';

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

export default function LevelsTab({
  currentUser,
  isSuperAdmin,
}: {
  currentUser: any;
  isSuperAdmin?: boolean;
}) {
  const { t }: { t: any } = useLanguage();
  const { showToast, showConfirm } = useToast();

  const [isLevelFormOpen, setIsLevelFormOpen] = useState(false);
  const [levelFormInitialData, setLevelFormInitialData] = useState<any>(null);
  const [siteLocked, setSiteLocked] = useState(false);
  const [siteLockBusy, setSiteLockBusy] = useState(false);
  const [syncingLists, setSyncingLists] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [refreshingCreators, setRefreshingCreators] = useState(false);
  const [refreshingTimelineCopy, setRefreshingTimelineCopy] = useState(false);

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
  const [showBadgeCreate, setShowBadgeCreate] = useState(false);
  const [badgePage, setBadgePage] = useState(1);
  const [isBadgeEditMode, setIsBadgeEditMode] = useState(false);
  const [isBadgeEditModalOpen, setIsBadgeEditModalOpen] = useState(false);
  const [draggedBadgeId, setDraggedBadgeId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redeem Codes state
  const [redeemCodes, setRedeemCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [newCodeText, setNewCodeText] = useState('');
  const [newCodeMonths, setNewCodeMonths] = useState(1);
  const [newCodeUsersPreset, setNewCodeUsersPreset] = useState<'all' | '1' | '5' | '10' | '50' | '100' | 'custom'>('all');
  const [newCodeCustomMaxUses, setNewCodeCustomMaxUses] = useState(1);
  const [newCodeExpiryPreset, setNewCodeExpiryPreset] = useState<'7' | '30' | '90' | '180' | '365' | 'never' | 'custom'>('30');
  const [newCodeCustomDays, setNewCodeCustomDays] = useState(30);
  const [creatingCode, setCreatingCode] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const fetchRedeemCodes = async () => {
    try {
      setLoadingCodes(true);
      const res = await fetch('/api/admin/redeem-codes');
      const data = await res.json();
      if (data.success && data.codes) {
        setRedeemCodes(data.codes);
      }
    } catch (e) {
      console.error('Failed to load redeem codes', e);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCodeText.trim();
    if (!code) {
      showToast('Vui lòng nhập mã code!', 'error');
      return;
    }
    if (newCodeMonths < 1) {
      showToast('Số tháng phải từ 1 trở lên!', 'error');
      return;
    }

    let maxUses: number | null = null;
    if (newCodeUsersPreset === 'all') {
      maxUses = null;
    } else if (newCodeUsersPreset === 'custom') {
      maxUses = newCodeCustomMaxUses > 0 ? newCodeCustomMaxUses : null;
    } else {
      maxUses = parseInt(newCodeUsersPreset, 10) || null;
    }

    let expiresInDays: number | null = null;
    if (newCodeExpiryPreset === 'never') {
      expiresInDays = null;
    } else if (newCodeExpiryPreset === 'custom') {
      expiresInDays = newCodeCustomDays > 0 ? newCodeCustomDays : null;
    } else {
      expiresInDays = parseInt(newCodeExpiryPreset, 10) || 30;
    }

    setCreatingCode(true);
    try {
      const res = await fetch('/api/admin/redeem-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          months: newCodeMonths,
          maxUses,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã kích hoạt mã "${data.code.code}" (${data.code.months} tháng)!`, 'success');
        setNewCodeText('');
        setNewCodeMonths(1);
        setNewCodeUsersPreset('all');
        setNewCodeCustomMaxUses(1);
        setNewCodeExpiryPreset('30');
        setNewCodeCustomDays(30);
        fetchRedeemCodes();
      } else {
        showToast(data.error || 'Lỗi khi tạo mã code', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setCreatingCode(false);
    }
  };

  const handleDeleteCode = async (id: string, codeStr: string) => {
    showConfirm(`Xác nhận xoá mã "${codeStr}"?`, async () => {
      try {
        const res = await fetch(`/api/admin/redeem-codes/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Đã xoá mã "${codeStr}"!`, 'success');
          setRedeemCodes((prev) => prev.filter((c) => c.id !== id));
        } else {
          showToast(data.error || 'Không thể xoá mã', 'error');
        }
      } catch {
        showToast('Lỗi kết nối máy chủ', 'error');
      }
    });
  };

  const handleToggleCodeActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/redeem-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemCodes((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
        );
        showToast(`Đã ${!currentActive ? 'kích hoạt' : 'tắt'} mã!`, 'success');
      }
    } catch {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  const handleCopyCode = (codeStr: string, id: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCodeId(id);
    showToast(`Đã sao chép mã "${codeStr}"!`, 'success');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Backup state
  const [backupStats, setBackupStats] = useState<{
    usersCount: number;
    levelsCount: number;
    recordsCount: number;
    dbSizeEst: string;
    mediaSize: string;
    mediaFilesCount: number;
  } | null>(null);
  const [loadingBackupStats, setLoadingBackupStats] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const fetchBackupStats = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingBackupStats(true);
      const res = await fetch('/api/admin/backup');
      const data = await res.json();
      if (data.success && data.stats) {
        setBackupStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load backup stats', e);
    } finally {
      setLoadingBackupStats(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!isSuperAdmin) return;
    setDownloadingBackup(true);
    showToast('Đang đóng gói và tải xuống bản sao lưu toàn hệ thống...', 'info');
    const link = document.createElement('a');
    link.href = '/api/admin/backup?action=download';
    link.download = `gdvn_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setDownloadingBackup(false);
      showToast('Đã bắt đầu tải file sao lưu về máy!', 'success');
    }, 2500);
  };

  useEffect(() => {
    fetchBadges();
    fetchBadgeCategories();
    fetchSiteLock();
    fetchRedeemCodes();
    if (isSuperAdmin) {
      fetchBackupStats();
    }
  }, [isSuperAdmin]);

  const fetchSiteLock = async () => {
    try {
      const res = await fetch('/api/site-lock');
      const data = await res.json();
      if (data.success) setSiteLocked(!!data.locked);
    } catch {}
  };

  const handleSiteLock = async (locked: boolean) => {
    showConfirm(locked ? t('admin.lock_turn_on') + '?' : t('admin.lock_turn_off') + '?', async () => {
      setSiteLockBusy(true);
      try {
        const res = await fetch('/api/site-lock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locked }),
        });
        const data = await res.json();
        if (data.success) {
          setSiteLocked(data.locked);
          showToast(data.locked ? t('admin.lock_on_ok') : t('admin.lock_off_ok'), 'success');
        } else {
          showToast(data.error || t('admin.action_fail'), 'error');
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      } finally {
        setSiteLockBusy(false);
      }
    });
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
        setShowBadgeCreate(false);
        setIsBadgeEditModalOpen(false);
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
          setIsBadgeEditModalOpen(false);
          fetchBadges();
        }
      } catch (e) {
        showToast('Lỗi kết nối', 'error');
      }
    });
  };

  const handleDropBadge = (targetId: string) => {
    if (!draggedBadgeId || draggedBadgeId === targetId) return;
    const sourceIndex = badgesList.findIndex((b) => b.id === draggedBadgeId);
    const targetIndex = badgesList.findIndex((b) => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newBadges = [...badgesList];
    const [movedItem] = newBadges.splice(sourceIndex, 1);
    newBadges.splice(targetIndex, 0, movedItem);
    setBadgesList(newBadges.map((b, i) => ({ ...b, sortOrder: i + 1 })));
    setDraggedBadgeId(null);
  };

  const persistBadgeOrder = async () => {
    try {
      const orderedIds = badgesList.map((b) => b.id);
      await fetch('/api/admin/badges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
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

  const handleSyncLists = (mode: 'ALL' | 'CLASSIC' | 'PLATFORMER' | 'POINTERCRATE' | 'PEMONLIST' | 'AREDL_CLASSIC' | 'AREDL_PLATFORMER') => {
    showConfirm(t('admin.sync_lists_confirm'), async () => {
      setSyncingLists(true);
      try {
        const res = await fetch('/api/admin/lists/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.sync_lists_fail'), 'error');
          return;
        }
        const summary = (data.results || [])
          .map(
            (r: { mode: string; synced: number; created: number; updated: number; stale: number; source?: string }) =>
              `${r.mode}: ${r.synced} (${r.created}+ / ${r.updated}~ / ${r.stale}-${r.source === 'uploadthing' ? ' snapshot' : ''})`
          )
          .join(' · ');
        showToast(t('admin.sync_lists_ok', { summary }), 'success');
      } catch {
        showToast(t('admin.sync_lists_fail'), 'error');
      } finally {
        setSyncingLists(false);
      }
    });
  };

  const handleSyncSheet = () => {
    showConfirm(t('admin.sync_sheet_confirm'), async () => {
      setSyncingSheet(true);
      try {
        const res = await fetch('/api/admin/lists/sync-sheet', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.sync_sheet_fail'), 'error');
          return;
        }
        showToast(t('admin.sync_sheet_ok', { count: data.count || 0 }), 'success');
      } catch {
        showToast(t('admin.sync_sheet_fail'), 'error');
      } finally {
        setSyncingSheet(false);
      }
    });
  };

  const handleRefreshCreators = () => {
    showConfirm(t('admin.refresh_creators_confirm'), async () => {
      setRefreshingCreators(true);
      try {
        const res = await fetch('/api/admin/levels/refresh-creators', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.refresh_creators_fail'), 'error');
          return;
        }
        showToast(t('admin.refresh_creators_ok', { updated: data.updated || 0, total: data.total || 0 }), 'success');
      } catch {
        showToast(t('admin.refresh_creators_fail'), 'error');
      } finally {
        setRefreshingCreators(false);
      }
    });
  };

  const handleRefreshTimelineCopy = () => {
    showConfirm(t('admin.refresh_timeline_copy_confirm'), async () => {
      setRefreshingTimelineCopy(true);
      try {
        const res = await fetch('/api/admin/timeline/refresh-level-copy', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.refresh_timeline_copy_fail'), 'error');
          return;
        }
        showToast(t('admin.refresh_timeline_copy_ok', { updated: data.updated || 0 }), 'success');
      } catch {
        showToast(t('admin.refresh_timeline_copy_fail'), 'error');
      } finally {
        setRefreshingTimelineCopy(false);
      }
    });
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

  return (
    <div className="space-y-4">
      <FnSection
        title={t('admin.sync_fn')}
        icon={<Wrench className="w-4 h-4" />}
        desc={t('admin.sync_fn_desc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('POINTERCRATE')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            Đồng bộ Pointercrate
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('PEMONLIST')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            Đồng bộ Pemonlist
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('AREDL_CLASSIC')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            Đồng bộ AREDL Classic
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('AREDL_PLATFORMER')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            Đồng bộ AREDL Platformer
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('ALL')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            {syncingLists ? t('admin.syncing') : t('admin.sync_all_lists')}
          </button>
          <button
            type="button"
            disabled={syncingSheet}
            onClick={handleSyncSheet}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingSheet ? 'animate-spin' : ''}`} />
            {syncingSheet ? t('admin.syncing') : t('admin.sync_sheet')}
          </button>
          <button
            type="button"
            disabled={refreshingCreators}
            onClick={handleRefreshCreators}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${refreshingCreators ? 'animate-spin' : ''}`} />
            {refreshingCreators ? t('admin.refreshing') : t('admin.refresh_creators')}
          </button>
          <button
            type="button"
            disabled={refreshingTimelineCopy}
            onClick={handleRefreshTimelineCopy}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 sm:col-span-2"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <Layers className={`w-3.5 h-3.5 ${refreshingTimelineCopy ? 'animate-spin' : ''}`} />
            {refreshingTimelineCopy ? t('admin.refreshing') : t('admin.refresh_timeline_copy')}
          </button>
        </div>
      </FnSection>

      <FnSection
        title={t('badge.manage')}
        icon={<Wrench className="w-4 h-4" />}
        desc={t('badge.manage_desc')}
      >
        <div className="space-y-4 pt-2">
          {/* Category Management */}
          <div className="p-3 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
            <div className="font-bold text-xs ui-title">{t('badge.cats_title')}</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('badge.cat_name_ph')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-xs border"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {t('badge.cat_add')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {badgeCategories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Badge Creation & Editing */}
          {!showBadgeCreate ? (
            <button
              type="button"
              onClick={() => {
                setBadgeForm(emptyBadgeForm);
                setShowBadgeCreate(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] inline-flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Plus className="w-3.5 h-3.5" /> {t('badge.create')}
            </button>
          ) : (
            <div className="space-y-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs ui-title">{t('badge.create_title')}</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowBadgeCreate(false);
                    setBadgeForm(emptyBadgeForm);
                  }}
                  className="text-[11px] font-bold ui-dim hover:opacity-100 cursor-pointer"
                >
                  {t('badge.cancel_create')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Tên huy hiệu"
                    value={badgeForm.name}
                    onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                    className="ui-input px-3 py-2 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả"
                    value={badgeForm.description}
                    onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                    className="ui-input px-3 py-2 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={badgeForm.categoryId}
                    onChange={(e) => setBadgeForm({ ...badgeForm, categoryId: e.target.value })}
                    className="ui-input px-3 py-2 rounded-xl"
                  >
                    <option value="">{t('badge.uncategorized')}</option>
                    {badgeCategories?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="text-[11px] font-bold uppercase ui-dim mb-2 block">Chọn Icon (SVG)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIconModalOpen(true)}
                    className="px-4 py-2 bg-[var(--bg-subtle)] border border-dashed border-[var(--border-ui)] rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-colors"
                  >
                    {badgeForm.imageUrl ? (
                      <>
                        <IconGlyph icon={badgeForm.imageUrl} className="w-4 h-4" />
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
                      <ColorPicker
                        value={badgeForm.color || '#FFD700'}
                        onChange={(color) => setBadgeForm({ ...badgeForm, color })}
                        ariaLabel="Badge color"
                        size={40}
                        round
                      />
                      <BadgeIcon
                        icon={badgeForm.imageUrl || 'Star'}
                        color={badgeForm.color}
                        glow={badgeForm.glow}
                        className="w-8 h-8"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={badgeForm.glow}
                      onChange={(e) => setBadgeForm({ ...badgeForm, glow: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-sm">Glow Effect (Phát sáng)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBadge}
                  disabled={actionLoading === 'badge'}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {t('badge.save_create')}
                </button>
              </div>
            </div>
          )}

          {/* Badges List View */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
                className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="ALL">{t('badge.filter_all_cats')}</option>
                <option value="NONE">{t('badge.uncategorized')}</option>
                {badgeCategories?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={badgeSort}
                onChange={(e) => setBadgeSort(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl border text-[11px] font-bold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="quality">{t('badge.sort_quality')}</option>
                <option value="name">{t('badge.sort_name')}</option>
                <option value="category">{t('badge.sort_category')}</option>
              </select>

              <button
                type="button"
                onClick={async () => {
                  if (isBadgeEditMode) {
                    await persistBadgeOrder();
                    setIsBadgeEditMode(false);
                  } else {
                    setIsBadgeEditMode(true);
                  }
                }}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  isBadgeEditMode ? 'bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]' : 'hover:opacity-80'
                }`}
                style={!isBadgeEditMode ? { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' } : {}}
                title="Chế độ kéo thả"
              >
                {isBadgeEditMode ? 'Đang chỉnh sửa' : 'Chỉnh sửa (Kéo Thả)'}
              </button>

              <button
                type="button"
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
              ) : filteredBadges?.length === 0 ? (
                <div className="col-span-full p-6 text-center text-xs ui-dim">{t('badge.none_found')}</div>
              ) : (
                filteredBadges?.slice((badgePage - 1) * 5, badgePage * 5).map((b: any, idx: number) => (
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
                        setBadgeForm({
                          imageUrl: b.icon || 'Star',
                          id: b.id,
                          name: b.name,
                          description: b.description || '',
                          color: b.color || '',
                          glow: !!b.glowColor,
                          categoryId: b.categoryId || '',
                          sortOrder: b.sortOrder || '',
                        });
                        setIsBadgeEditModalOpen(true);
                      }
                    }}
                    className={`flex ${
                      badgesViewMode === 'grid' ? 'flex-col items-center justify-center text-center' : 'items-center'
                    } gap-3 p-3 rounded-xl border ${
                      isBadgeEditMode
                        ? 'cursor-grab active:cursor-grabbing border-dashed border-[var(--accent)] bg-black/5 dark:bg-white/5'
                        : 'cursor-pointer hover:scale-[1.02] hover:border-[var(--accent)] hover:shadow-md'
                    } transition-all`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: isBadgeEditMode ? 'var(--accent)' : 'var(--border-ui)' }}
                  >
                    <span className="text-[10px] font-black ui-dim w-6">#{b.sortOrder || (badgePage - 1) * 5 + idx + 1}</span>
                    <BadgeIcon icon={b.icon || 'Star'} color={b.color} glow={b.glowColor} className="w-7 h-7" />
                    <div className={`min-w-0 flex-1 ${badgesViewMode === 'grid' ? 'w-full' : ''}`}>
                      <div className="font-bold ui-title text-xs truncate">{b.name}</div>
                      <div className="text-[10px] ui-dim truncate">
                        {b.badgeCategory?.name || t('badge.uncategorized')}
                        {b.description ? ` · ${b.description}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <AdminListPager page={badgePage} total={filteredBadges?.length || 0} onPage={setBadgePage} t={t} pageSize={5} />
          </div>
        </div>
      </FnSection>

      {/* Redeem Code Management */}
      <FnSection
        title="Quản Lý Mã Đổi Thưởng Supporter"
        icon={<Gift className="w-4 h-4 text-pink-500" />}
        desc="Tạo mã đổi thưởng tuỳ chỉnh quy đổi ra tháng sử dụng Supporter"
      >
        <div className="space-y-4 pt-1">
          {/* Create Code Form */}
          <form onSubmit={handleCreateCode} className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
            <div className="font-bold text-xs ui-title flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-pink-500" />
              Tạo Mã Mới
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              <div>
                <label className="block text-[11px] font-bold ui-dim mb-1.5 h-4 leading-4">Mã Code (Tự đặt tuỳ chọn)</label>
                <div className="relative">
                  <Ticket className="w-3.5 h-3.5 ui-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={newCodeText}
                    onChange={(e) => setNewCodeText(e.target.value.toUpperCase())}
                    placeholder="VD: GDVN2026"
                    className="w-full h-[38px] pl-8 pr-3 rounded-xl text-xs font-mono font-bold tracking-wider border focus:ring-1 focus:ring-pink-500 outline-none uppercase"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold ui-dim mb-1.5 h-4 leading-4">Số tháng Supporter</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={newCodeMonths}
                  onChange={(e) => setNewCodeMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-[38px] px-3 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-pink-500 outline-none"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold ui-dim mb-1.5 h-4 leading-4">Số người dùng</label>
                <div className="flex gap-1.5">
                  <select
                    value={newCodeUsersPreset}
                    onChange={(e) => setNewCodeUsersPreset(e.target.value as any)}
                    className="flex-1 h-[38px] px-2.5 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-pink-500 outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  >
                    <option value="all">Toàn bộ người dùng</option>
                    <option value="1">1 người (Dùng 1 lần)</option>
                    <option value="5">5 người</option>
                    <option value="10">10 người</option>
                    <option value="50">50 người</option>
                    <option value="100">100 người</option>
                    <option value="custom">Tuỳ chỉnh số người...</option>
                  </select>
                  {newCodeUsersPreset === 'custom' && (
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      value={newCodeCustomMaxUses}
                      onChange={(e) => setNewCodeCustomMaxUses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="Số user"
                      className="w-20 h-[38px] px-2 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-pink-500 outline-none text-center"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold ui-dim mb-1.5 h-4 leading-4">Thời hạn tồn tại của mã</label>
                <div className="flex gap-1.5">
                  <select
                    value={newCodeExpiryPreset}
                    onChange={(e) => setNewCodeExpiryPreset(e.target.value as any)}
                    className="flex-1 h-[38px] px-2.5 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-pink-500 outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  >
                    <option value="30">30 ngày (1 tháng)</option>
                    <option value="7">7 ngày</option>
                    <option value="90">90 ngày (3 tháng)</option>
                    <option value="180">180 ngày (6 tháng)</option>
                    <option value="365">365 ngày (1 năm)</option>
                    <option value="never">Vĩnh viễn (Không hết hạn)</option>
                    <option value="custom">Tự nhập số ngày...</option>
                  </select>
                  {newCodeExpiryPreset === 'custom' && (
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={newCodeCustomDays}
                      onChange={(e) => setNewCodeCustomDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="Ngày"
                      className="w-16 h-[38px] px-2 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-pink-500 outline-none text-center"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-[11px] ui-dim leading-relaxed">
                💡 <b>Số người dùng</b>: Chọn <i>"Toàn bộ người dùng"</i> để bất kỳ ai cũng có thể kích hoạt, hoặc giới hạn số lượng người nhận (mỗi tài khoản chỉ dùng được mã 1 lần).
              </div>
              <button
                type="submit"
                disabled={creatingCode || !newCodeText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {creatingCode ? 'Đang kích hoạt...' : 'Kích Hoạt / Thêm Code'}
              </button>
            </div>
          </form>

          {/* Codes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold ui-dim px-1">
              <span>Danh sách mã kích hoạt ({redeemCodes.length})</span>
              <button
                type="button"
                onClick={fetchRedeemCodes}
                disabled={loadingCodes}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingCodes ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {loadingCodes ? (
              <div className="p-6 text-center text-xs ui-dim">Đang tải danh sách mã...</div>
            ) : redeemCodes.length === 0 ? (
              <div className="p-6 text-center text-xs ui-dim border rounded-2xl" style={{ borderColor: 'var(--border-ui)' }}>
                Chưa có mã Redeem nào. Hãy nhập mã và số tháng ở trên để kích hoạt!
              </div>
            ) : (
              <div className="space-y-2">
                {redeemCodes.map((c) => {
                  const isUnlimited = c.maxUses === null || c.maxUses === 0;
                  const isDepleted = !isUnlimited && c.maxUses !== null && c.usedCount >= c.maxUses;
                  const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  const isCopied = copiedCodeId === c.id;
                  const daysLeft = c.expiresAt ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(c.code, c.id)}
                          title="Click để sao chép mã"
                          className="px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 border hover:opacity-80 transition-all cursor-pointer bg-black/5 dark:bg-white/5"
                          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                        >
                          <Ticket className="w-3.5 h-3.5 text-pink-500" />
                          <span>{c.code}</span>
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500 ml-1" /> : <Copy className="w-3 h-3 ui-dim ml-1" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-pink-500">+{c.months} tháng Supporter</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              !c.isActive
                                ? 'bg-zinc-500/10 text-zinc-500'
                                : isExpired
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : isDepleted
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {!c.isActive ? 'Đã tắt' : isExpired ? 'Đã hết hạn' : isDepleted ? 'Đã dùng hết' : 'Hoạt động'}
                            </span>
                          </div>
                          <div className="text-[10px] ui-dim mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>
                              Số người dùng:{' '}
                              <b>
                                {isUnlimited ? (
                                  <>{c.usedCount} (Toàn bộ)</>
                                ) : (
                                  <>{c.usedCount} / {c.maxUses}</>
                                )}
                              </b>
                            </span>
                            <span>·</span>
                            <span>
                              Hạn dùng:{' '}
                              <b className={isExpired ? 'text-rose-500' : ''}>
                                {c.expiresAt ? (
                                  <>
                                    {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
                                    {!isExpired && daysLeft !== null && (
                                      <span className="opacity-75 font-normal ml-1">
                                        (còn {Math.max(1, daysLeft)} ngày)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  'Vĩnh viễn'
                                )}
                              </b>
                            </span>
                            {c.createdAt ? (
                              <>
                                <span>·</span>
                                <span>Tạo ngày {new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                              </>
                            ) : null}
                            {c.createdBy?.username ? (
                              <span>bởi {c.createdBy.username}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleCodeActive(c.id, c.isActive)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                        >
                          {c.isActive ? 'Tắt mã' : 'Bật lại'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCode(c.id, c.code)}
                          className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
                          title="Xoá mã code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FnSection>

      {isSuperAdmin && (
        <FnSection
          title="Sao lưu hệ thống (System Backup)"
          icon={<HardDrive className="w-4 h-4 text-emerald-400" />}
          desc="Tải về bản sao lưu toàn bộ cơ sở dữ liệu PostgreSQL và toàn bộ ảnh/media tải lên của người dùng."
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                  Trạng thái dữ liệu hệ thống:
                </span>
                <button
                  type="button"
                  onClick={fetchBackupStats}
                  disabled={loadingBackupStats}
                  className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBackupStats ? 'animate-spin' : ''}`} />
                  Cập nhật
                </button>
              </div>

              {loadingBackupStats ? (
                <div className="text-xs ui-dim py-2 text-center animate-pulse">Đang kiểm tra dung lượng dữ liệu...</div>
              ) : backupStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="text-xs ui-dim">Người dùng</div>
                    <div className="text-sm font-bold ui-title">{backupStats.usersCount.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="text-xs ui-dim">Màn chơi (Levels)</div>
                    <div className="text-sm font-bold ui-title">{backupStats.levelsCount.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="text-xs ui-dim">Kỷ lục (Records)</div>
                    <div className="text-sm font-bold ui-title">{backupStats.recordsCount.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="text-xs ui-dim">Media & DB</div>
                    <div className="text-sm font-bold text-emerald-500">{backupStats.mediaSize} ({backupStats.mediaFilesCount} files)</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs ui-dim py-1">Nhấn &quot;Cập nhật&quot; để xem chi tiết thống kê dung lượng.</div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={downloadingBackup}
                onClick={handleDownloadBackup}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${downloadingBackup ? 'animate-bounce' : ''}`} />
                {downloadingBackup ? 'Đang chuẩn bị và tải xuống...' : 'Tải về toàn bộ dữ liệu (.tar.gz) ngay'}
              </button>
              <p className="text-[11px] ui-dim opacity-75 text-center">
                Bao gồm: PostgreSQL Dump nén gzip + toàn bộ thư mục user-data (avatars, banners, media).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
              <div className="font-bold text-blue-400">💡 Sao lưu tự động & Tải qua dòng lệnh:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-85">
                <li>
                  Tải trực tiếp về máy tính bằng Python script: <code className="px-1 py-0.5 rounded bg-black/20 font-mono">python backup.py</code> (lưu vào thư mục <code className="px-1 py-0.5 rounded bg-black/20 font-mono">backups/</code>).
                </li>
                <li>
                  Cron job tự động sao lưu lúc 02:00 hàng ngày trên VPS và đồng bộ sang Google Drive qua rclone.
                </li>
              </ul>
            </div>
          </div>
        </FnSection>
      )}

      <FnSection title={t('admin.lock_title')} icon={<Lock className="w-4 h-4" />} desc={t('admin.lock_desc')} danger>
        <button
          type="button"
          disabled={siteLockBusy}
          onClick={() => handleSiteLock(!siteLocked)}
          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Lock className="w-3.5 h-3.5" />
          {siteLockBusy ? t('admin.lock_busy') : siteLocked ? t('admin.lock_turn_off') : t('admin.lock_turn_on')}
        </button>
      </FnSection>

      <LevelFormModal
        isOpen={isLevelFormOpen}
        onClose={() => setIsLevelFormOpen(false)}
        initialData={levelFormInitialData}
        onSaved={() => {}}
      />

      {isIconModalOpen && (
        <div className="fixed inset-0 z-[100200] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-bold text-sm ui-title">Chọn Icon Huy Hiệu</h3>
              <button type="button" onClick={() => setIsIconModalOpen(false)} className="p-1 rounded-lg border hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <input
                type="text"
                placeholder="Tìm kiếm icon..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              />
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-4 overflow-y-auto flex-1">
              {BADGE_ICON_NAMES.filter((name) => !iconSearch || name.toLowerCase().includes(iconSearch.toLowerCase())).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setBadgeForm({ ...badgeForm, imageUrl: name });
                    setIsIconModalOpen(false);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 hover:border-[var(--accent)] hover:scale-105 transition-all ${badgeForm.imageUrl === name ? 'border-[var(--accent)] bg-black/5 dark:bg-white/5' : ''}`}
                  style={{ borderColor: badgeForm.imageUrl === name ? 'var(--accent)' : 'var(--border-ui)' }}
                >
                  <IconGlyph icon={name} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
