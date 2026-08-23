'use client';

import React from 'react';
import { X, Flag } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { DIFFICULTY_FILTER_OPTIONS, getDifficultyFaceUrl } from '@/lib/gdDifficulty';

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
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.mode')}</label>
            <div className="flex flex-wrap gap-2">
              {['CLASSIC', 'PLATFORMER'].map((m) => (
                <label key={m} className="flex items-center gap-2 px-3 py-2 rounded-xl border ui-subtle cursor-pointer hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={filterModes.includes(m)}
                    onChange={() => toggle(filterModes, m, setFilterModes)}
                  />
                  <span className="text-xs font-bold">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.tier')}</label>
            <div className="flex flex-wrap gap-2">
              {['MAIN', 'EXTENDED', 'LEGACY'].map((tierName) => (
                <label key={tierName} className="flex items-center gap-2 px-3 py-2 rounded-xl border ui-subtle cursor-pointer hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={filterTiers.includes(tierName)}
                    onChange={() => toggle(filterTiers, tierName, setFilterTiers)}
                  />
                  <span className="text-xs font-bold">{t(`levelslist.${tierName.toLowerCase()}` as any)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.difficulty')}</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_FILTER_OPTIONS.map((df) => (
                <label key={df.val} className="flex items-center gap-2 px-3 py-2 rounded-xl border ui-subtle cursor-pointer hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={filterFaces.includes(df.val)}
                    onChange={() => toggle(filterFaces, df.val, setFilterFaces)}
                  />
                  <img src={getDifficultyFaceUrl(df.val)} className="w-5 h-5 object-contain" alt="" />
                  <span className="text-xs font-bold">{df.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase ui-dim">{t('filters.tags')}</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border ui-subtle cursor-pointer w-fit hover:bg-black/5">
              <input
                type="checkbox"
                checked={filterVN}
                onChange={(e) => setFilterVN(e.target.checked)}
              />
              <Flag className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold">{t('filters.vn_only')}</span>
            </label>
          </div>
        </div>

        <button
          onClick={() => {
            setFilterModes(['CLASSIC', 'PLATFORMER']);
            setFilterTiers(['MAIN', 'EXTENDED', 'LEGACY']);
            setFilterFaces([]);
            setFilterVN(false);
          }}
          className="w-full py-2.5 rounded-xl border text-xs font-bold hover:bg-black/5 mt-4"
        >
          {t('filters.reset')}
        </button>
      </div>
    </div>
  );
}
