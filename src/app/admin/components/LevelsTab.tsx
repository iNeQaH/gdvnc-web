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
  const [syncingGdlisthub, setSyncingGdlisthub] = useState(false);
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

  useEffect(() => {
    fetchBadges();
    fetchBadgeCategories();
    fetchSiteLock();
  }, []);

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

  const handleSyncLists = (mode: 'ALL' | 'CLASSIC' | 'PLATFORMER') => {
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

  const handleSyncGdlisthub = () => {
    showConfirm(t('admin.sync_gdlisthub_confirm'), async () => {
      setSyncingGdlisthub(true);
      try {
        const res = await fetch('/api/admin/lists/sync-gdlisthub', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.sync_gdlisthub_fail'), 'error');
          return;
        }
        showToast(
          t('admin.sync_gdlisthub_ok', {
            fl: data.results?.find((r: any) => r.type === 'Featured List')?.synced || 0,
            dl: data.results?.find((r: any) => r.type === 'Demon List')?.synced || 0,
          }),
          'success'
        );
      } catch {
        showToast(t('admin.sync_gdlisthub_fail'), 'error');
      } finally {
        setSyncingGdlisthub(false);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
            disabled={syncingGdlisthub}
            onClick={handleSyncGdlisthub}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingGdlisthub ? 'animate-spin' : ''}`} />
            {syncingGdlisthub ? t('admin.syncing') : t('admin.sync_gdlisthub')}
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
