'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { Loader2, Search, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw } from 'lucide-react';

type SortDir = 'asc' | 'desc';

interface EditCell {
  id: string;
  field: string;
}

const RATING_OPTIONS = ['NONE', 'RATE', 'FEATURE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const;
const MODE_OPTIONS = ['CLASSIC', 'PLATFORMER'] as const;

const COLUMNS = [
  { key: 'placement', label: 'Top', type: 'number', w: 'w-14' },
  { key: 'vnPlacement', label: 'VN #', type: 'number', w: 'w-14' },
  { key: 'classicRank', label: 'Classic #', type: 'number', w: 'w-14' },
  { key: 'gdLevelId', label: 'GD ID', type: 'number', w: 'w-20' },
  { key: 'name', label: 'Name', type: 'text', w: 'min-w-[140px]' },
  { key: 'creatorName', label: 'Creator', type: 'text', w: 'min-w-[100px]' },
  { key: 'verifierName', label: 'Verifier', type: 'text', w: 'min-w-[100px]' },
  { key: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS, w: 'w-28' },
  { key: 'difficultyFace', label: 'Diff', type: 'number', w: 'w-14' },
  { key: 'ratingType', label: 'Rating', type: 'select', options: RATING_OPTIONS, w: 'w-28' },
  { key: 'isVN', label: 'VN', type: 'checkbox', w: 'w-12' },
  { key: 'isChallenge', label: 'Challenge', type: 'checkbox', w: 'w-12' },
  { key: 'minPercent', label: 'Min %', type: 'number', w: 'w-14' },
  { key: 'basePp', label: 'Base PP', type: 'readonly', w: 'w-16' },
  { key: 'youtubeId', label: 'YouTube ID', type: 'text', w: 'w-28' },
] as const;

export default function LevelDataGrid({ currentUser }: { currentUser: any }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('placement');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const fetchLevels = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/levels')
      .then(r => r.json())
      .then(d => { if (d.success) setLevels(d.levels); })
      .catch(() => showToast('Failed to load levels', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus();
  }, [editCell]);

  // --- Sorting ---
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedLevels = useMemo(() => {
    let items = [...levels];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.creatorName?.toLowerCase().includes(q) ||
        l.verifierName?.toLowerCase().includes(q) ||
        String(l.gdLevelId).includes(q)
      );
    }
    items.sort((a, b) => {
      let va = a[sortKey] ?? (typeof a[sortKey] === 'number' ? 999999 : '');
      let vb = b[sortKey] ?? (typeof b[sortKey] === 'number' ? 999999 : '');
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (typeof va === 'boolean') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
      if (va == null) va = sortKey === 'placement' || sortKey === 'vnPlacement' || sortKey === 'classicRank' ? 999999 : '';
      if (vb == null) vb = sortKey === 'placement' || sortKey === 'vnPlacement' || sortKey === 'classicRank' ? 999999 : '';
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [levels, sortKey, sortDir, search]);

  // --- Save ---
  const saveLevel = async (lvl: any) => {
    setSavingId(lvl.id);
    try {
      const payload = {
        ...lvl,
        id: lvl.id,
        gdLevelId: String(lvl.gdLevelId ?? ''),
        placement: lvl.placement != null && String(lvl.placement).trim() !== '' ? String(lvl.placement) : '',
        vnPlacement: lvl.vnPlacement != null && String(lvl.vnPlacement).trim() !== '' ? String(lvl.vnPlacement) : '',
        classicRank: lvl.classicRank != null && String(lvl.classicRank).trim() !== '' ? String(lvl.classicRank) : '',
        minPercent: String(lvl.minPercent ?? 100),
      };
      const res = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved: ${lvl.name}`, 'success');
        if (data.level) {
          setLevels(prev => prev.map(l => l.id === lvl.id ? { ...l, ...data.level } : l));
        }
      } else {
        showToast(data.error || 'Save failed', 'error');
        fetchLevels();
      }
    } catch {
      showToast('Network error', 'error');
      fetchLevels();
    } finally {
      setSavingId(null);
    }
  };

  // --- Inline edit ---
  const startEdit = (lvl: any, field: string) => {
    if (savingId) return;
    const col = COLUMNS.find(c => c.key === field);
    if (!col || col.type === 'readonly' || col.type === 'checkbox') return;
    setEditCell({ id: lvl.id, field });
    const val = lvl[field];
    setEditValue(val == null ? '' : String(val));
  };

  const commitEdit = (lvl: any) => {
    if (!editCell) return;
    const { field } = editCell;
    setEditCell(null);

    const col = COLUMNS.find(c => c.key === field);
    if (!col) return;

    let newVal: any = editValue.trim();
    const oldVal = lvl[field];

    if (col.type === 'number') {
      newVal = newVal === '' ? null : Number(newVal);
      if (newVal !== null && isNaN(newVal)) return; // invalid
    }

    // no change
    if (newVal === oldVal || (newVal == null && oldVal == null)) return;

    const updated = { ...lvl, [field]: newVal };
    setLevels(prev => prev.map(l => l.id === lvl.id ? updated : l));
    saveLevel(updated);
  };

  const commitSelect = (lvl: any, field: string, value: string) => {
    setEditCell(null);
    if (lvl[field] === value) return;
    const updated = { ...lvl, [field]: value };
    setLevels(prev => prev.map(l => l.id === lvl.id ? updated : l));
    saveLevel(updated);
  };

  const toggleCheckbox = (lvl: any, field: string) => {
    if (savingId) return;
    const updated = { ...lvl, [field]: !lvl[field] };
    setLevels(prev => prev.map(l => l.id === lvl.id ? updated : l));
    saveLevel(updated);
  };

  // --- Render helpers ---
  const isEditing = (id: string, field: string) =>
    editCell?.id === id && editCell?.field === field;

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-60" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />;
  };

  const cellClass = (isSaving: boolean) =>
    `px-2 py-1.5 cursor-pointer transition-colors ${isSaving ? 'opacity-40' : 'hover:bg-[var(--accent)]/10'}`;

  const inputClass = 'w-full px-1.5 py-0.5 text-xs rounded border outline-none bg-transparent';

  const renderCell = (lvl: any, col: typeof COLUMNS[number], idx: number) => {
    const key = col.key;
    const val = lvl[key as keyof typeof lvl];
    const isSaving = savingId === lvl.id;

    // Checkbox columns: always show checkbox
    if (col.type === 'checkbox') {
      return (
        <td key={key} className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={() => toggleCheckbox(lvl, key)}
            disabled={isSaving}
            className="w-4 h-4 rounded cursor-pointer accent-[var(--accent)]"
          />
        </td>
      );
    }

    // Read-only columns
    if (col.type === 'readonly') {
      return (
        <td key={key} className="px-2 py-1.5 font-mono text-[11px] opacity-70">
          {typeof val === 'number' ? val.toFixed(1) : (val ?? '-')}
        </td>
      );
    }

    // Currently editing this cell
    if (isEditing(lvl.id, key)) {
      if (col.type === 'select' && col.options) {
        return (
          <td key={key} className="px-1 py-0.5">
            <select
              ref={inputRef as any}
              value={editValue}
              onChange={e => commitSelect(lvl, key, e.target.value)}
              onBlur={() => setEditCell(null)}
              className={`${inputClass} bg-[var(--bg-card)]`}
              style={{ borderColor: 'var(--accent)', color: 'var(--text-title)' }}
            >
              {col.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </td>
        );
      }

      return (
        <td key={key} className="px-1 py-0.5">
          <input
            ref={inputRef as any}
            type={col.type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => commitEdit(lvl)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit(lvl);
              if (e.key === 'Escape') setEditCell(null);
            }}
            className={inputClass}
            style={{ borderColor: 'var(--accent)', color: 'var(--text-title)' }}
          />
        </td>
      );
    }

    // Display mode
    return (
      <td
        key={key}
        className={cellClass(isSaving)}
        onClick={() => startEdit(lvl, key)}
      >
        {renderDisplayValue(key, val, lvl)}
      </td>
    );
  };

  const renderDisplayValue = (key: string, val: any, lvl: any) => {
    // Rank columns with colored badges
    if (key === 'placement') {
      return val != null ? (
        <span className="font-mono font-bold text-sky-400">#{val}</span>
      ) : <span className="opacity-30">-</span>;
    }
    if (key === 'vnPlacement') {
      return val != null ? (
        <span className="font-mono font-bold text-emerald-400">#{val}</span>
      ) : <span className="opacity-30">-</span>;
    }
    if (key === 'classicRank') {
      return val != null ? (
        <span className="font-mono font-bold text-purple-400">#{val}</span>
      ) : <span className="opacity-30">-</span>;
    }
    if (key === 'gdLevelId') {
      return <span className="font-mono text-[11px]">{val}</span>;
    }
    if (key === 'name') {
      return <span className="font-bold">{val}</span>;
    }
    if (key === 'mode') {
      const isPlatformer = val === 'PLATFORMER';
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          isPlatformer
            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
            : 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
        }`}>
          {val}
        </span>
      );
    }
    if (key === 'ratingType') {
      const colors: Record<string, string> = {
        MYTHIC: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        LEGENDARY: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        EPIC: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        FEATURE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        RATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
      const cls = colors[val] || 'opacity-40';
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
          {val || 'NONE'}
        </span>
      );
    }
    if (key === 'difficultyFace') {
      return <span className="font-mono">{val ?? 0}</span>;
    }
    if (key === 'minPercent') {
      return <span className="font-mono">{val ?? 100}%</span>;
    }
    if (key === 'youtubeId') {
      return val ? (
        <a
          href={`https://youtu.be/${val}`}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="font-mono text-[11px] text-red-400 hover:underline truncate block max-w-[120px]"
        >
          {val}
        </a>
      ) : <span className="opacity-30">-</span>;
    }
    // Default
    return <span className="opacity-80">{val ?? '-'}</span>;
  };

  if (loading && levels.length === 0) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="animate-spin w-8 h-8 text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="ui-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            placeholder="Search by name, creator, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{ borderColor: 'var(--border-ui)' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs ui-dim">
            {sortedLevels.length} / {levels.length} levels
          </span>
          <button
            onClick={fetchLevels}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border-ui)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className="w-full rounded-2xl border overflow-auto max-h-[80vh] shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead
            className="sticky top-0 z-20 shadow-sm select-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
          >
            <tr className="border-b" style={{ borderColor: 'var(--border-ui)' }}>
              <th className="px-2 py-2.5 font-bold text-[10px] uppercase opacity-40 w-10">#</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`px-2 py-2.5 font-bold text-[10px] uppercase cursor-pointer group hover:bg-[var(--bg-subtle)] transition-colors ${col.w}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {sortedLevels.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-12 text-center ui-dim">
                  No levels found
                </td>
              </tr>
            ) : (
              sortedLevels.map((lvl, idx) => (
                <tr
                  key={lvl.id}
                  className={`transition-colors ${savingId === lvl.id ? 'opacity-50' : 'hover:bg-[var(--bg-subtle)]'}`}
                >
                  <td className="px-2 py-1.5 font-mono text-[10px] opacity-40 text-center">
                    {savingId === lvl.id
                      ? <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)] inline" />
                      : idx + 1
                    }
                  </td>
                  {COLUMNS.map(col => renderCell(lvl, col, idx))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
