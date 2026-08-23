'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Copy, Settings } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import LevelFiltersModal from '@/components/LevelFiltersModal';
import { getDifficultyFaceUrl, matchesDifficultyFilter, getRatingIconUrl } from '@/lib/gdDifficulty';

export default function RoulettePage() {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [levels, setLevels] = useState<any[]>([]);
  const [filterModes, setFilterModes] = useState<string[]>(['CLASSIC']);
  const [filterTiers, setFilterTiers] = useState<string[]>(['MAIN']);
  const [filterFaces, setFilterFaces] = useState<number[]>([]);
  const [filterVN, setFilterVN] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedLevel, setSelectedLevel] = useState<any | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState<any>(null);
  const spinInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/levels?mode=ALL')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLevels(data.levels || []);
      });
  }, []);

  const getFilteredPool = () => {
    return levels.filter((lvl) => {
      if (filterModes.length > 0 && !filterModes.includes(lvl.mode)) return false;

      if (filterTiers.length > 0) {
        let tierMatch = false;
        if (filterTiers.includes('MAIN') && lvl.placement && lvl.placement <= 75) tierMatch = true;
        if (filterTiers.includes('EXTENDED') && lvl.placement && lvl.placement > 75 && lvl.placement <= 150) tierMatch = true;
        if (filterTiers.includes('LEGACY') && lvl.placement && lvl.placement > 150) tierMatch = true;
        if (!tierMatch) return false;
      }

      if (!matchesDifficultyFilter(lvl.difficultyFace ?? 10, filterFaces)) return false;
      if (filterVN && !lvl.isVN) return false;
      return true;
    });
  };

  const handleSpin = () => {
    const pool = getFilteredPool();
    if (pool.length === 0) {
      showToast('Không có level nào phù hợp với bộ lọc này!', 'error');
      return;
    }

    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedLevel(null);

    let counter = 0;
    const maxTicks = 40;

    spinInterval.current = setInterval(() => {
      const randomLevel = pool[Math.floor(Math.random() * pool.length)];
      setCurrentDisplay(randomLevel);
      counter++;

      if (counter >= maxTicks) {
        if (spinInterval.current) clearInterval(spinInterval.current);
        setIsSpinning(false);
        const finalPick = pool[Math.floor(Math.random() * pool.length)];
        setCurrentDisplay(finalPick);
        setSelectedLevel(finalPick);
      }
    }, 50);
  };

  const handleCopyId = () => {
    if (selectedLevel) {
      navigator.clipboard.writeText(selectedLevel.gdLevelId.toString());
      showToast('Đã copy ID: ' + selectedLevel.gdLevelId, 'success');
    }
  };

  const poolCount = getFilteredPool().length;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold ui-title tracking-tight">
          Roulette
        </h1>
        <p className="text-xs ui-dim">
          Quay ngẫu nhiên một Level theo bộ lọc bạn chọn.
        </p>
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ui-subtle hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Settings className="w-4 h-4" />
          {t('filters.title')}
          {(filterModes.length > 0 || filterTiers.length > 0 || filterFaces.length > 0 || filterVN) && (
            <span className="w-2 h-2 rounded-full bg-red-500 ml-1"></span>
          )}
        </button>
      </div>

      <div className="ui-card p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent)] rounded-full blur-[100px] opacity-10 pointer-events-none" />

        <div className="py-12 flex flex-col items-center justify-center relative min-h-[140px]">
          <div className="absolute inset-x-0 h-1/3 top-1/2 -translate-y-1/2 bg-[var(--accent)]/5 blur-xl rounded-full" />

          <div className="z-10 flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl sm:text-4xl font-black ui-title truncate max-w-full px-4 select-none drop-shadow-md">
              {currentDisplay ? currentDisplay.name : 'Ready'}
            </h2>
            {currentDisplay && (
              <div className="flex items-center justify-center gap-2 animate-in zoom-in-95 duration-100">
                <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                  {getRatingIconUrl(currentDisplay.ratingType) && (
                    <img src={getRatingIconUrl(currentDisplay.ratingType)} alt="" className="absolute inset-0 w-full h-full object-contain drop-shadow-md" />
                  )}
                  <img src={getDifficultyFaceUrl(currentDisplay.difficultyFace ?? 10)} alt="" className="relative w-10 h-10 object-contain z-10 drop-shadow-md" />
                </div>
                <span className={`text-[12px] font-black px-2.5 py-1 rounded-lg uppercase border tracking-wider shadow-sm ${currentDisplay.mode === 'PLATFORMER' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                  {currentDisplay.mode}
                </span>
              </div>
            )}
          </div>

          {selectedLevel && !isSpinning && (
            <div className="text-[11px] ui-dim mt-4 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 flex-wrap justify-center">
              <img src={getDifficultyFaceUrl(selectedLevel.difficultyFace ?? 10)} className="w-5 h-5 object-contain" alt="" />
              <span>{t('common.by')} <span className="font-semibold ui-title">{selectedLevel.creatorName}</span></span>
              <span>·</span>
              <span>ID: <strong className="ui-title">{selectedLevel.gdLevelId}</strong></span>
              <span>·</span>
              <span>Base Points: <strong className="text-[var(--accent)]">{selectedLevel.basePp?.toFixed(1)}</strong></span>
            </div>
          )}
        </div>

        <button
          onClick={handleSpin}
          disabled={isSpinning || poolCount === 0}
          className="w-full max-w-[280px] mx-auto px-8 py-3 rounded-xl text-sm font-black text-[color:var(--accent-fg)] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4" style={{ backgroundColor: "var(--accent)" }}
        >
          <Sparkles className="w-4 h-4" />
          {isSpinning ? t('roulette.spinning') : `SPIN (${poolCount})`}
        </button>
      </div>

      {selectedLevel && !isSpinning && (
        <div className="ui-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-bold ui-dim">{t('roulette.selected')}</div>
            <div className="text-sm font-bold ui-title">
              #{selectedLevel.placement} - {selectedLevel.name}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyId}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ui-subtle hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy ID
            </button>
            <Link
              href={`/submit?levelId=${selectedLevel.id}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm text-[color:var(--accent-fg)] cursor-pointer disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}
            >
              {t('roulette.submit')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

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


