'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X, Medal } from 'lucide-react';
import BadgeIcon from '@/components/BadgeIcon';
import { useLanguage } from '@/components/LanguageContext';

type BadgeItem = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  glowColor?: string | null;
  sortOrder?: number;
  badgeCategory?: { id: string; name: string } | null;
};

export default function BadgePickerModal({
  isOpen,
  onClose,
  badges,
  selectedIds,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  badges: BadgeItem[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { t } = useLanguage();
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [sortBy, setSortBy] = useState<'quality' | 'name' | 'category'>('quality');

  useEffect(() => {
    if (isOpen) {
      setDraftIds(selectedIds);
      setSearch('');
      setCategoryId('ALL');
      setSortBy('quality');
    }
  }, [isOpen, selectedIds]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    badges.forEach((b) => {
      if (b.badgeCategory) map.set(b.badgeCategory.id, b.badgeCategory.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [badges]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = badges.filter((b) => {
      const catMatch = categoryId === 'ALL' || b.badgeCategory?.id === categoryId || (categoryId === 'NONE' && !b.badgeCategory);
      const nameMatch = !q || b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
      return catMatch && nameMatch;
    });
    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') {
        return (a.badgeCategory?.name || '').localeCompare(b.badgeCategory?.name || '') || (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name);
    });
  }, [badges, search, categoryId, sortBy]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 z-[100200] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="font-extrabold text-base ui-title flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-500" />
              {t('badge.picker_title')}
            </h2>
            <p className="text-[11px] ui-dim mt-0.5">{t('badge.picker_selected', { n: draftIds.length })}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('badge.search_name')}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              <option value="ALL">{t('badge.filter_all_cats')}</option>
              <option value="NONE">{t('badge.uncategorized')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              <option value="quality">{t('badge.sort_quality')}</option>
              <option value="name">{t('badge.sort_name')}</option>
              <option value="category">{t('badge.sort_category')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs ui-dim">{t('badge.none_found')}</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filtered.map((b, idx) => {
                const selected = draftIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: selected ? 'var(--accent-bg)' : 'transparent' }}
                  >
                    <span className="text-[10px] font-black ui-dim w-6 shrink-0">#{b.sortOrder || idx + 1}</span>
                    <BadgeIcon
                      icon={b.icon || 'Star'}
                      color={b.color}
                      glow={b.glowColor}
                      className="w-5 h-5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold ui-title truncate">{b.name}</div>
                      <div className="text-[10px] ui-dim truncate">
                        {b.badgeCategory?.name || t('badge.uncategorized')}
                        {b.description ? ` · ${b.description}` : ''}
                      </div>
                    </div>
                    {selected && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(draftIds);
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {t('badge.apply')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
