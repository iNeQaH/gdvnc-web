'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  Layers,
  Plus,
  Crown,
  X,
  FolderPlus,
  Search,
  Lock,
  LayoutGrid,
  List,
  ChevronDown,
  Trash2
} from 'lucide-react';
import BadgeIcon, { IconGlyph } from '@/components/BadgeIcon';
import ColorPicker from '@/components/ColorPicker';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import LevelFormModal from '@/components/LevelFormModal';
import { type DictKey } from '@/lib/dictionaries';

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

export default function LevelsTab({
  currentUser,
  isSuperAdmin,
  
  // badge props
  badgeCategories,
  newCategoryName,
  setNewCategoryName,
  handleCreateCategory,
  handleDeleteCategory,
  showBadgeCreate,
  setShowBadgeCreate,
  badgeForm,
  setBadgeForm,
  emptyBadgeForm,
  setIsIconModalOpen,
  handleSaveBadge,
  actionLoading,
  badgeSearch,
  setBadgeSearch,
  badgeFilterCategory,
  setBadgeFilterCategory,
  badgeSort,
  setBadgeSort,
  isBadgeEditMode,
  setIsBadgeEditMode,
  persistBadgeOrder,
  badgesViewMode,
  setBadgesViewMode,
  loadingBadges,
  filteredBadges,
  badgePage,
  setBadgePage,
  handleDropBadge,
  setIsBadgeEditModalOpen,
  setDraggedBadgeId,
  
  // siteLock
  siteLocked,
  setSiteLocked
}: any) {
  const { t } = useLanguage();
  const { showToast, showConfirm } = useToast();

  const [isLevelFormOpen, setIsLevelFormOpen] = useState(false);
  const [levelFormInitialData, setLevelFormInitialData] = useState<any>(null);
  const [siteLockBusy, setSiteLockBusy] = useState(false);
  const [syncingLists, setSyncingLists] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [syncingGdlisthub, setSyncingGdlisthub] = useState(false);
  const [refreshingCreators, setRefreshingCreators] = useState(false);
  const [refreshingTimelineCopy, setRefreshingTimelineCopy] = useState(false);

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
        const r = data.result || {};
        const summary = `FL ${r.featuredUpdated || 0}/${r.featuredCount || 0} · CL +${r.classicCreated || 0}/${r.classicCount || 0}`;
        showToast(t('admin.sync_gdlisthub_ok', { summary }), 'success');
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
        const r = data.result || {};
        const summary = `${r.fetched || 0} level · +${r.levelsCreated || 0} / ~${r.levelsUpdated || 0} · ${r.creatorsQueued || 0} creator · unverify ${r.usersUnverified || 0}`;
        showToast(t('admin.sync_sheet_ok', { summary }), 'success');
      } catch {
        showToast(t('admin.sync_sheet_fail'), 'error');
      } finally {
        setSyncingSheet(false);
      }
    });
  };

  const runPagedAdminJob = async (url: string) => {
    let cursor: string | undefined;
    let scanned = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    for (;;) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursor ? { cursor } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Job failed');
      }
      scanned += data.scanned || 0;
      updated += data.updated || 0;
      failed += data.failed || 0;
      skipped += data.skipped || 0;
      if (data.done) break;
      cursor = data.nextCursor;
      if (!cursor) break;
    }
    return { scanned, updated, failed, skipped };
  };

  const handleRefreshCreators = () => {
    showConfirm(t('admin.refresh_creators_confirm'), async () => {
      setRefreshingCreators(true);
      try {
        const r = await runPagedAdminJob('/api/admin/levels/refresh-creators');
        showToast(
          t('admin.refresh_creators_ok', {
            summary: `${r.updated} · scan ${r.scanned} · skip ${r.skipped} · fail ${r.failed}`,
          }),
          'success'
        );
      } catch (err: any) {
        showToast(err?.message || t('admin.refresh_creators_fail'), 'error');
      } finally {
        setRefreshingCreators(false);
      }
    });
  };

  const handleRefreshTimelineCopy = () => {
    showConfirm(t('admin.refresh_timeline_copy_confirm'), async () => {
      setRefreshingTimelineCopy(true);
      try {
        const r = await runPagedAdminJob('/api/admin/timeline/refresh-level-copy');
        showToast(
          t('admin.refresh_timeline_copy_ok', {
            summary: `${r.updated} · scan ${r.scanned} · fail ${r.failed}`,
          }),
          'success'
        );
      } catch (err: any) {
        showToast(err?.message || t('admin.refresh_timeline_copy_fail'), 'error');
      } finally {
        setRefreshingTimelineCopy(false);
      }
    });
  };

  const handleSiteLock = (locked: boolean) => {
    showConfirm(locked ? t('admin.lock_confirm_on') : t('admin.lock_confirm_off'), async () => {
      setSiteLockBusy(true);
      try {
        const res = await fetch('/api/site-lock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locked }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.lock_fail'), 'error');
          return;
        }
        setSiteLocked(!!data.locked);
        showToast(data.locked ? t('admin.lock_on_ok') : t('admin.lock_off_ok'), 'success');
        if (data.locked) window.location.href = '/';
      } catch {
        showToast(t('admin.lock_fail'), 'error');
      } finally {
        setSiteLockBusy(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <FnSection
        title={t('admin.sync_lists')}
        icon={<RefreshCw className="w-4 h-4" />}
        desc={t('admin.sync_lists_desc')}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('ALL')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLists ? 'animate-spin' : ''}`} />
            {syncingLists ? t('admin.sync_lists_working') : t('admin.sync_lists')}
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('CLASSIC')}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)', backgroundColor: 'var(--bg-subtle)' }}
          >
            {t('admin.sync_lists_classic')}
          </button>
          <button
            type="button"
            disabled={syncingLists}
            onClick={() => handleSyncLists('PLATFORMER')}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)', backgroundColor: 'var(--bg-subtle)' }}
          >
            {t('admin.sync_lists_plat')}
          </button>
        </div>
      </FnSection>

      <FnSection
        title={t('admin.sync_sheet')}
        icon={<RefreshCw className="w-4 h-4" />}
        desc={t('admin.sync_sheet_desc')}
      >
        <button
          type="button"
          disabled={syncingSheet}
          onClick={handleSyncSheet}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingSheet ? 'animate-spin' : ''}`} />
          {syncingSheet ? t('admin.sync_sheet_working') : t('admin.sync_sheet')}
        </button>
      </FnSection>

      <FnSection
        title={t('admin.sync_gdlisthub')}
        icon={<RefreshCw className="w-4 h-4" />}
        desc={t('admin.sync_gdlisthub_desc')}
      >
        <button
          type="button"
          disabled={syncingGdlisthub}
          onClick={handleSyncGdlisthub}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingGdlisthub ? 'animate-spin' : ''}`} />
          {syncingGdlisthub ? t('admin.sync_gdlisthub_working') : t('admin.sync_gdlisthub')}
        </button>
      </FnSection>

      <FnSection
        title={t('admin.refresh_creators')}
        icon={<RefreshCw className="w-4 h-4" />}
        desc={t('admin.refresh_creators_desc')}
      >
        <button
          type="button"
          disabled={refreshingCreators}
          onClick={handleRefreshCreators}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingCreators ? 'animate-spin' : ''}`} />
          {refreshingCreators ? t('admin.refresh_creators_working') : t('admin.refresh_creators')}
        </button>
      </FnSection>

      <FnSection
        title={t('admin.refresh_timeline_copy')}
        icon={<RefreshCw className="w-4 h-4" />}
        desc={t('admin.refresh_timeline_copy_desc')}
      >
        <button
          type="button"
          disabled={refreshingTimelineCopy}
          onClick={handleRefreshTimelineCopy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingTimelineCopy ? 'animate-spin' : ''}`} />
          {refreshingTimelineCopy ? t('admin.refresh_timeline_copy_working') : t('admin.refresh_timeline_copy')}
        </button>
      </FnSection>

      <FnSection
        title="Công cụ Markdown to HTML"
        icon={<Layers className="w-4 h-4" />}
        desc="Mở công cụ chuyển đổi nhanh Discord Markdown sang chuẩn HTML dành cho mục Hỗ trợ (FAQ)."
      >
        <a
          href="/tools/MarkdownToHTML.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Mở công cụ
        </a>
      </FnSection>

      <FnSection
        title={t('admin.fn_level_title')}
        icon={<Layers className="w-4 h-4" />}
        desc={t('admin.fn_level_desc')}
      >
        <button
          onClick={() => {
            setLevelFormInitialData(null);
            setIsLevelFormOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs inline-flex items-center justify-center gap-1 cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus className="w-3.5 h-3.5" /> {t('admin.fn_add_level')}
        </button>
        <p className="text-xs ui-dim">{t('admin.fn_level_note')}</p>
      </FnSection>

      <FnSection
        title={t('admin.fn_badges_title')}
        icon={<Crown className="w-4 h-4" />}
      >
        <div className="space-y-3">
          <h4 className="font-bold text-xs ui-title">{t('badge.categories')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {badgeCategories?.map((c: any) => (
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
                  {badgeCategories?.map((c: any) => (
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
                  <input type="checkbox" checked={badgeForm.glow} onChange={e => setBadgeForm({...badgeForm, glow: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-bold text-sm">Glow Effect (Phát sáng)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveBadge} disabled={actionLoading === 'badge'} className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs cursor-pointer" style={{ backgroundColor: 'var(--accent)' }}>
                {t('badge.save_create')}
              </button>
            </div>
          </div>
          )}

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
                  <option key={c.id} value={c.id}>{c.name}</option>
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
                onClick={async () => {
                  if (isBadgeEditMode) {
                    await persistBadgeOrder();
                    setIsBadgeEditMode(false);
                  } else {
                    setIsBadgeEditMode(true);
                  }
                }}
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
              ) : filteredBadges?.length === 0 ? (
                <div className="col-span-full p-6 text-center text-xs ui-dim">{t('badge.none_found')}</div>
              ) : filteredBadges?.slice((badgePage - 1) * 5, badgePage * 5).map((b: any, idx: number) => (
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
                  <span className="text-[10px] font-black ui-dim w-6">#{b.sortOrder || (badgePage - 1) * 5 + idx + 1}</span>
                  <BadgeIcon
                    icon={b.icon || 'Star'}
                    color={b.color}
                    glow={b.glowColor}
                    className="w-7 h-7"
                  />
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
            <AdminListPager
              page={badgePage}
              total={filteredBadges?.length || 0}
              onPage={setBadgePage}
              t={t}
              pageSize={5}
            />
          </div>
        </div>
      </FnSection>

      <FnSection
        title={t('admin.lock_title')}
        icon={<Lock className="w-4 h-4" />}
        desc={t('admin.lock_desc')}
        danger
      >
        <button
          type="button"
          disabled={siteLockBusy}
          onClick={() => handleSiteLock(true)}
          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Lock className="w-3.5 h-3.5" />
          {siteLockBusy ? t('admin.lock_busy') : t('admin.lock_turn_on')}
        </button>
      </FnSection>
      
      <LevelFormModal
        isOpen={isLevelFormOpen}
        onClose={() => setIsLevelFormOpen(false)}
        initialData={levelFormInitialData}
        onSaved={() => {}}
      />
    </div>
  );
}
