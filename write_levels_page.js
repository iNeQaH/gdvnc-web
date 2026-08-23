const fs = require('fs');

const content = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, Plus, Trash2, Pencil, ExternalLink, 
  Play, Video, Target, Trophy, Clock, Flag, 
  LayoutGrid, List, Settings, CheckCircle, Sparkles 
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import LevelFormModal from '@/components/LevelFormModal';
import LevelFiltersModal from '@/components/LevelFiltersModal';
import { useToast } from '@/components/GlobalToast';
import { getDifficultyFaceUrl, getRatingIconUrl, matchesDifficultyFilter } from '@/lib/gdDifficulty';

export default function LevelsListPage() {
  const { t } = useLanguage();
  const { showConfirm, showToast } = useToast();
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Filters
  const [filterModes, setFilterModes] = useState<string[]>(['CLASSIC']);
  const [filterTiers, setFilterTiers] = useState<string[]>(['MAIN']);
  const [filterFaces, setFilterFaces] = useState<number[]>([]);
  const [filterVN, setFilterVN] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchLevels();
  }, []);

  const fetchLevels = () => {
    setLoading(true);
    fetch('/api/levels?mode=ALL')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLevels(data.levels || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleDeleteLevel = (id: string, name: string) => {
    if (!currentUser) return;
    showConfirm(
      'B?n c� ch?c ch?n mu?n xo� level "' + name + '"? H�nh d?ng n�y s? xo� vinh vi?n to�n b? k? l?c li�n quan!',
      async () => {
        try {
          const res = await fetch('/api/admin/levels?id=' + id + '&userId=' + currentUser.id, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            showToast('�� xo� level th�nh c�ng!', 'success');
            fetchLevels();
          } else {
            showToast(data.error || 'L?i khi xo� level.', 'error');
          }
        } catch (e) {
          showToast('L?i k?t n?i m�y ch?.', 'error');
        }
      }
    );
  };

  const getThumbnail = (lvl: any) => {
    if (lvl.youtubeId) return 'https://img.youtube.com/vi/' + lvl.youtubeId + '/hqdefault.jpg';
    return 'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';
  };

  const filtered = levels.filter((lvl) => {
    // 1. Mode filter
    if (filterModes.length > 0 && !filterModes.includes(lvl.mode)) {
      return false;
    }

    // 2. Tier filter
    if (filterTiers.length > 0) {
      let tierMatch = false;
      if (filterTiers.includes('MAIN') && lvl.placement && lvl.placement <= 75) tierMatch = true;
      if (filterTiers.includes('EXTENDED') && lvl.placement && lvl.placement > 75 && lvl.placement <= 150) tierMatch = true;
      if (filterTiers.includes('LEGACY') && lvl.placement && lvl.placement > 150) tierMatch = true;
      if (!tierMatch) return false;
    }

    // 3. Difficulty face filter
    if (!matchesDifficultyFilter(lvl.difficultyFace ?? 10, filterFaces)) {
      return false;
    }

    // 4. VN tag filter
    if (filterVN && !lvl.isVN) return false;

    // 5. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = lvl.name?.toLowerCase().includes(q);
      const matchCreator = lvl.creatorName?.toLowerCase().includes(q);
      const matchId = String(lvl.gdLevelId || '').includes(q);
      if (!matchName && !matchCreator && !matchId) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isAnyFilterActive = filterModes.length > 0 || filterTiers.length > 0 || filterFaces.length > 0 || filterVN;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-ui)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 ui-title">
            <span className="text-red-500">??</span>
            {t('levelslist.title')}
          </h1>
          <p className="text-xs ui-dim max-w-md">{t('levelslist.desc')}</p>
        </div>

        {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
          <button
            onClick={() => {
              setEditingLevel(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="w-4 h-4" />
            Th�m Level M?i
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row justify-between gap-3 items-stretch lg:items-center">
          {/* Search and Filters */}
          <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ui-dim" />
              <input
                type="text"
                placeholder={t('levelslist.search')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold ui-input focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ui-subtle hover:bg-black/5 dark:hover:bg-white/5 shrink-0 cursor-pointer"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Filters</span>
              {isAnyFilterActive && (
                <span className="w-2 h-2 rounded-full bg-red-500 ml-0.5"></span>
              )}
            </button>

            {/* Quick Toggle Buttons: Classic, Platformer, VN */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setFilterModes((prev) =>
                    prev.includes('CLASSIC') ? prev.filter((m) => m !== 'CLASSIC') : [...prev, 'CLASSIC']
                  );
                  setCurrentPage(1);
                }}
                className={'px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ' + (
                  filterModes.includes('CLASSIC')
                    ? 'shadow-sm'
                    : 'ui-subtle hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                )}
                style={
                  filterModes.includes('CLASSIC')
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' }
                    : { borderColor: 'var(--border-ui)' }
                }
              >
                Classic
              </button>

              <button
                onClick={() => {
                  setFilterModes((prev) =>
                    prev.includes('PLATFORMER') ? prev.filter((m) => m !== 'PLATFORMER') : [...prev, 'PLATFORMER']
                  );
                  setCurrentPage(1);
                }}
                className={'px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ' + (
                  filterModes.includes('PLATFORMER')
                    ? 'shadow-sm'
                    : 'ui-subtle hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                )}
                style={
                  filterModes.includes('PLATFORMER')
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' }
                    : { borderColor: 'var(--border-ui)' }
                }
              >
                Platformer
              </button>

              <button
                onClick={() => {
                  setFilterVN(!filterVN);
                  setCurrentPage(1);
                }}
                className={'px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ' + (
                  filterVN
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'ui-subtle hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                )}
                style={!filterVN ? { borderColor: 'var(--border-ui)' } : {}}
              >
                <Flag className="w-3.5 h-3.5" />
                VN
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
              title="Chuy?n ch? d? xem Lu?i / Danh s�ch"
            >
              {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Level List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2.5'}>
        {loading ? (
          <div className="col-span-full p-16 text-center ui-dim text-xs font-medium">{t('levelslist.loading')}</div>
        ) : paginatedData.length === 0 ? (
          <div className="col-span-full p-16 text-center ui-dim text-xs font-medium space-y-2">
            <div>{t('levelslist.empty')}</div>
            <button
              onClick={() => {
                setSearch('');
                setFilterModes(['CLASSIC', 'PLATFORMER']);
                setFilterTiers(['MAIN', 'EXTENDED', 'LEGACY']);
                setFilterFaces([]);
                setFilterVN(false);
              }}
              className="text-xs font-bold underline cursor-pointer text-sky-500"
            >
              �?t l?i t?t c? b? l?c
            </button>
          </div>
        ) : (
          paginatedData.map((lvl) => {
            const placement = lvl.placement ? '#' + lvl.placement : '-';
            const ratingIcon = getRatingIconUrl(lvl.ratingType);
            const faceIcon = getDifficultyFaceUrl(lvl.difficultyFace ?? 10);

            if (viewMode === 'list') {
              return (
                <div
                  key={lvl.id}
                  className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all border ui-card flex items-center justify-between p-3 gap-3"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  <Link href={'/levels/' + lvl.id} className="flex items-center gap-3.5 flex-1 min-w-0">
                    <span className="w-10 text-center text-xs font-black shrink-0 px-1.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 ui-title">
                      {placement}
                    </span>

                    <div className="relative w-14 h-9 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
                      <img src={getThumbnail(lvl)} alt="" className="w-full h-full object-cover" />
                    </div>

                    <img src={faceIcon} alt="" className="w-6 h-6 object-contain shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold ui-title truncate group-hover:text-[var(--accent)] transition-colors">
                          {lvl.name}
                        </h2>
                        {ratingIcon && <img src={ratingIcon} alt="" className="w-3.5 h-3.5 object-contain" />}
                        {lvl.isVN && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                            ???? VN
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 ui-dim shrink-0">
                          {lvl.mode}
                        </span>
                      </div>
                      <p className="text-[11px] ui-dim truncate">
                        {t('common.by')} <span className="font-semibold">{lvl.creatorName || 'Unknown'}</span>
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 text-xs shrink-0 pr-2">
                      <span className="text-[11px] font-semibold text-[var(--accent)]">
                        {lvl.basePp ? lvl.basePp.toFixed(1) + ' pts' : ''}
                      </span>
                      <span className="text-[11px] font-bold flex items-center gap-1 ui-dim">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        {lvl.records?.length || 0}
                      </span>
                    </div>
                  </Link>

                  {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingLevel(lvl);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ui-dim hover:text-sky-500 cursor-pointer"
                        title="Ch?nh s?a Level"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteLevel(lvl.id, lvl.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ui-dim hover:text-red-500 cursor-pointer"
                        title="Xo� Level"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // Grid Mode Card
            return (
              <div
                key={lvl.id}
                className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all border ui-card flex flex-col h-48 justify-between"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: 'url(' + getThumbnail(lvl) + ')', filter: 'brightness(0.55)' }}
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <Link href={'/levels/' + lvl.id} className="relative p-4 flex flex-col h-full justify-between text-white z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-black/60 backdrop-blur-sm border border-white/20">
                        {placement}
                      </span>
                      {lvl.isVN && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-600/90 text-white backdrop-blur-sm border border-red-400/30">
                          ???? VN
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <img src={faceIcon} alt="" className="w-6 h-6 object-contain drop-shadow-md" />
                      {ratingIcon && <img src={ratingIcon} alt="" className="w-5 h-5 object-contain drop-shadow-md" />}
                      <span className="text-xs font-bold flex items-center gap-1 opacity-90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        {lvl.records?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black drop-shadow-lg truncate">{lvl.name}</h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">{lvl.mode}</span>
                    </div>
                    <p className="text-xs opacity-80 truncate">
                      {t('common.by')} <span className="font-semibold">{lvl.creatorName || 'Unknown'}</span>
                    </p>
                  </div>
                </Link>

                {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingLevel(lvl);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 rounded text-white hover:text-sky-400 cursor-pointer"
                      title="Ch?nh s?a Level"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                      className="p-1.5 rounded text-white hover:text-red-400 cursor-pointer"
                      title="Xo� Level"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 pt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={'w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ' + (
                currentPage === i + 1
                  ? 'shadow-md'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 ui-dim'
              )}
              style={
                currentPage === i + 1
                  ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }
                  : {}
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      <LevelFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingLevel}
        onSaved={() => {
          setIsFormOpen(false);
          fetchLevels();
        }}
      />

      <LevelFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterModes={filterModes}
        setFilterModes={setFilterModes}
        filterTiers={filterTiers}
        setFilterTiers={setFilterTiers}
        filterFaces={filterFaces}
        setFilterFaces={setFilterFaces}
        filterVN={filterVN}
        setFilterVN={setFilterVN}
      />
    </div>
  );
}
`;

fs.writeFileSync('src/app/levels/page.tsx', content, 'utf8');
console.log('src/app/levels/page.tsx generated perfectly!');
