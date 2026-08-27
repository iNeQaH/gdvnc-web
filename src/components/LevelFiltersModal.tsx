'use client';

import React from 'react';
import { X, Flag, Goal } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { DIFFICULTY_FILTER_OPTIONS, getDifficultyFaceUrl } from '@/lib/gdDifficulty';
import ColorToggle from './ColorToggle';

interface LevelFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterModes: string[];
  setFilterModes: (next: string[]) => void;
  filterTiers: string[];
  setFilterTiers: (next: string[]) => void;
  filterFaces: number[];
  setFilterFaces: (next: number[]) => void;
  filterVN: boolean;
  setFilterVN: (next: boolean) => void;
  filterChallenge?: boolean;
  setFilterChallenge?: (next: boolean) => void;
  showModeFilters?: boolean;
  showChallengeToggle?: boolean;
}

export default function LevelFiltersModal({
  isOpen,
  onClose,
  filterModes,
  setFilterModes,
  filterTiers,
  setFilterTiers,
  filterFaces,
  setFilterFaces,
  filterVN,
  setFilterVN,
  filterChallenge = false,
  setFilterChallenge,
  showModeFilters = true,
  showChallengeToggle = false,
}: LevelFiltersModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const toggle = <T,>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="ui-card w-full max-w-md p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black ui-title">{t('filters.title')}</h2>

        <div className="space-y-4">
          {showModeFilters && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.mode')}</label>
                <div className="flex flex-wrap gap-2">
                  {['CLASSIC', 'PLATFORMER'].map((m) => (
                    <ColorToggle
                      key={m}
                      pressed={filterModes.includes(m)}
                      onToggle={() => toggle(filterModes, m, setFilterModes)}
                    >
                      {m}
                    </ColorToggle>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.tier')}</label>
                <div className="flex flex-wrap gap-2">
                  {['MAIN', 'EXTENDED', 'LEGACY'].map((tierName) => (
                    <ColorToggle
                      key={tierName}
                      pressed={filterTiers.includes(tierName)}
                      onToggle={() => toggle(filterTiers, tierName, setFilterTiers)}
                    >
                      {t(`levelslist.${tierName.toLowerCase()}` as any)}
                    </ColorToggle>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.difficulty')}</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_FILTER_OPTIONS.map((df) => (
                <ColorToggle
                  key={df.val}
                  pressed={filterFaces.includes(df.val)}
                  onToggle={() => toggle(filterFaces, df.val, setFilterFaces)}
                >
                  <img src={getDifficultyFaceUrl(df.val)} className="w-5 h-5 object-contain" alt="" />
                  {df.label}
                </ColorToggle>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.tags')}</label>
            <div className="flex flex-wrap gap-2">
              <ColorToggle pressed={filterVN} onToggle={() => setFilterVN(!filterVN)}>
                <Flag className="w-4 h-4 text-red-500" />
                {t('filters.vn_only')}
              </ColorToggle>
              {showChallengeToggle && setFilterChallenge && (
                <ColorToggle pressed={filterChallenge} onToggle={() => setFilterChallenge(!filterChallenge)}>
                  <Goal className="w-4 h-4" />
                  {t('filters.challenge')}
                </ColorToggle>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => {
              setFilterModes([]);
              setFilterTiers([]);
              setFilterFaces([]);
              setFilterVN(false);
              setFilterChallenge?.(false);
            }}
            className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-black/5"
          >
            {t('filters.reset')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[color:var(--accent-fg)]"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('filters.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
