'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import {
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Download,
} from 'lucide-react';

type SortDir = 'asc' | 'desc';

interface EditCell {
  id: string;
  field: string;
}

const RATING_OPTIONS = ['NONE', 'RATE', 'FEATURE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const;
const MODE_OPTIONS = ['CLASSIC', 'PLATFORMER'] as const;

const COLUMNS = [
  { key: 'placement', label: 'Top', type: 'number', w: 60 },
  { key: 'vnPlacement', label: 'VN #', type: 'number', w: 60 },
  { key: 'classicRank', label: 'Classic #', type: 'number', w: 60 },
  { key: 'gdLevelId', label: 'GD ID', type: 'number', w: 80 },
  { key: 'name', label: 'Name', type: 'text', w: 200 },
  { key: 'creatorName', label: 'Creator', type: 'text', w: 120 },
  { key: 'verifierName', label: 'Verifier', type: 'text', w: 120 },
  { key: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS, w: 100 },
  { key: 'difficultyFace', label: 'Diff', type: 'number', w: 60 },
  { key: 'ratingType', label: 'Rating', type: 'select', options: RATING_OPTIONS, w: 100 },
  { key: 'isVN', label: 'VN', type: 'checkbox', w: 50 },
  { key: 'isChallenge', label: 'Challenge', type: 'checkbox', w: 70 },
  { key: 'minPercent', label: 'Min %', type: 'number', w: 60 },
  { key: 'basePp', label: 'Base Pt', type: 'readonly', w: 70 },
  { key: 'youtubeId', label: 'YouTube ID', type: 'text', w: 120 },
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (exportFilteredOnly: boolean = false) => {
    const targetList = exportFilteredOnly ? sortedLevels : levels;
    if (!targetList || targetList.length === 0) {
      showToast('Không có dữ liệu để xuất', 'error');
      return;
    }

    setExportMenuOpen(false);

    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const suffix = exportFilteredOnly && search ? '_search_filtered' : '_all';
      const filename = `gdvn_levels_${timestamp}${suffix}.csv`;

      const headers = [
        'Top (Placement)',
        'VN # (VN Placement)',
        'Classic # (Classic Rank)',
        'GD Level ID',
        'Tên Level',
        'Creator (Tác giả)',
        'Verifier (Người xác thực)',
        'Chế độ (Mode)',
        'Độ khó (Difficulty)',
        'Difficulty Face (0-14)',
        'Rating Type',
        'Level VN (isVN)',
        'Challenge (isChallenge)',
        'Min %',
        'Base Pt',
        'YouTube ID',
        'Link YouTube',
        'Mô tả (Description)',
        'Ngày tạo',
        'Ngày cập nhật',
      ];

      const escapeCsvCell = (val: any) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`;
        }
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = targetList.map((lvl) => [
        lvl.placement ?? '',
        lvl.vnPlacement ?? '',
        lvl.classicRank ?? '',
        lvl.gdLevelId ?? '',
        lvl.name ?? '',
        lvl.creatorName ?? '',
        lvl.verifierName ?? '',
        lvl.mode ?? 'CLASSIC',
        lvl.difficulty ?? '',
        lvl.difficultyFace ?? 0,
        lvl.ratingType ?? 'NONE',
        lvl.isVN ? 'Có' : 'Không',
        lvl.isChallenge ? 'Có' : 'Không',
        lvl.minPercent ?? 100,
        lvl.basePp != null ? Number(lvl.basePp).toFixed(1) : '',
        lvl.youtubeId ?? '',
        lvl.youtubeId ? `https://youtu.be/${lvl.youtubeId}` : '',
        lvl.description ?? '',
        lvl.createdAt ? new Date(lvl.createdAt).toISOString() : '',
        lvl.updatedAt ? new Date(lvl.updatedAt).toISOString() : '',
      ]);

      const csvContent =
        '\uFEFF' +
        [
          headers.map(escapeCsvCell).join(','),
          ...rows.map((row) => row.map(escapeCsvCell).join(',')),
        ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Đã xuất thành công ${targetList.length.toLocaleString()} màn chơi sang file Excel (.csv)!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Có lỗi xảy ra khi tạo file bảng tính', 'error');
    }
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    COLUMNS.forEach(c => w[c.key] = c.w as number);
    w['__index'] = 40;
    return w;
  });

  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startResize = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    resizingCol.current = key;
    startX.current = e.clientX;
    startWidth.current = colWidths[key] || 100;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current) return;
      const diff = e.clientX - startX.current;
      let newW = startWidth.current + diff;
      if (newW < 30) newW = 30;
      setColWidths(prev => ({ ...prev, [resizingCol.current!]: newW }));
    };
    const onMouseUp = () => {
      resizingCol.current = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
      const isNumeric = sortKey === "placement" || sortKey === "vnPlacement" || sortKey === "classicRank" || sortKey === "gdLevelId" || sortKey === "difficultyFace" || sortKey === "minPercent" || sortKey === "basePp";
      
      let va = a[sortKey];
      let vb = b[sortKey];

      if (isNumeric) {
        va = (va == null || va === "") ? 999999 : Number(va);
        vb = (vb == null || vb === "") ? 999999 : Number(vb);
      } else {
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (typeof va === "boolean") { va = va ? 1 : 0; vb = vb ? 1 : 0; }
        va = va ?? "";
        vb = vb ?? "";
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [levels, sortKey, sortDir, search]);

  const paginatedLevels = useMemo(() => {
    if (pageSize === -1) return sortedLevels;
    const start = (page - 1) * pageSize;
    return sortedLevels.slice(start, start + pageSize);
  }, [sortedLevels, page, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedLevels.length / pageSize);

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
    `px-2 py-1.5 cursor-pointer transition-colors overflow-hidden text-ellipsis whitespace-nowrap ${isSaving ? 'opacity-40' : 'hover:bg-[var(--accent)]/10'}`;

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
        MYTHIC: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        LEGENDARY: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
        EPIC: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        FEATURE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
        RATE: 'bg-yellow-100/10 text-yellow-200/80 border-yellow-200/20',
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{ borderColor: 'var(--border-ui)' }}
          />
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs ui-dim">
            {sortedLevels.length} / {levels.length} levels
          </span>

          {/* Export button with dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-emerald-600/30">
              <button
                type="button"
                onClick={() => handleExport(false)}
                disabled={loading || levels.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Tải về toàn bộ màn chơi dưới dạng bảng tính Excel (.csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={loading || levels.length === 0}
                className="px-1.5 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 transition-colors border-l border-emerald-800/40 cursor-pointer disabled:opacity-50"
                title="Tuỳ chọn xuất bảng tính"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {exportMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-64 rounded-2xl border shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 text-xs"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-ui)',
                }}
              >
                <div className="px-2.5 py-1 text-[11px] font-bold ui-dim uppercase tracking-wider">
                  Tuỳ chọn xuất bảng tính
                </div>
                <button
                  type="button"
                  onClick={() => handleExport(false)}
                  className="w-full px-2.5 py-2 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-medium ui-title">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    Xuất toàn bộ hệ thống
                  </span>
                  <span className="font-mono text-[11px] font-bold opacity-60">
                    {levels.length}
                  </span>
                </button>

                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => handleExport(true)}
                    className="w-full px-2.5 py-2 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium ui-title">
                      <Download className="w-4 h-4 text-sky-500" />
                      Chỉ xuất kết quả tìm kiếm
                    </span>
                    <span className="font-mono text-[11px] font-bold opacity-60">
                      {sortedLevels.length}
                    </span>
                  </button>
                )}

                <div className="pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <a
                    href="/api/admin/levels/export"
                    download
                    onClick={() => setExportMenuOpen(false)}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-[11px] text-[var(--accent)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải trực tiếp từ máy chủ (API)</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchLevels}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50 cursor-pointer"
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
        <table className="text-left border-collapse text-xs" style={{ tableLayout: 'fixed', width: 'max-content' }}>
          <thead
            className="sticky top-0 z-20 shadow-sm select-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
          >
            <tr className="border-b" style={{ borderColor: 'var(--border-ui)' }}>
              <th className="relative px-2 py-2.5 font-bold text-[10px] uppercase opacity-40" style={{ width: colWidths['__index'] }}>
                #
                <div 
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[var(--accent)]/50 active:bg-[var(--accent)] z-10"
                  onMouseDown={(e) => startResize(e, '__index')}
                  onClick={e => e.stopPropagation()}
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="relative px-2 py-2.5 font-bold text-[10px] uppercase group hover:bg-[var(--bg-subtle)] transition-colors select-none"
                  style={{ width: colWidths[col.key] }}
                >
                  <div className="flex items-center gap-1 cursor-pointer overflow-hidden whitespace-nowrap" onClick={() => handleSort(col.key)}>
                    <span className="truncate">{col.label}</span>
                    {renderSortIcon(col.key)}
                  </div>
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[var(--accent)]/50 active:bg-[var(--accent)] z-10"
                    onMouseDown={(e) => startResize(e, col.key)}
                    onClick={e => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {paginatedLevels.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-12 text-center ui-dim">
                  No levels found
                </td>
              </tr>
            ) : (
              paginatedLevels.map((lvl, idx) => (
                <tr
                  key={lvl.id}
                  className={`transition-colors ${savingId === lvl.id ? 'opacity-50' : 'hover:bg-[var(--bg-subtle)]'}`}
                >
                  <td className="px-2 py-1.5 font-mono text-[10px] opacity-40 text-center">
                    {savingId === lvl.id
                      ? <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)] inline" />
                      : (pageSize === -1 ? 0 : (page - 1) * pageSize) + idx + 1
                    }
                  </td>
                  {COLUMNS.map(col => renderCell(lvl, col, idx))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 ui-card" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-ui)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs ui-dim">Hien thi</span>
          <select 
            value={pageSize} 
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="text-xs p-1 rounded border outline-none bg-transparent"
            style={{ borderColor: "var(--border-ui)", color: "var(--text-title)" }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>Tat ca</option>
          </select>
          <span className="text-xs ui-dim">tren tong so {sortedLevels.length}</span>
        </div>
        
        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-ui)", color: "var(--text-title)" }}
            >
              Truoc
            </button>
            <span className="text-xs px-2 ui-dim font-mono">Trang {page} / {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-ui)", color: "var(--text-title)" }}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
