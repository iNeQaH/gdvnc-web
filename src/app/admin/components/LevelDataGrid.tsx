'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { Loader2, Search, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

export default function LevelDataGrid({ currentUser }: { currentUser: any }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchLevels = () => {
    setLoading(true);
    fetch('/api/admin/levels')
      .then(r => r.json())
      .then(d => {
        if (d.success) setLevels(d.levels);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLevels = useMemo(() => {
    let sortableItems = [...levels];
    if (search) {
      const s = search.toLowerCase();
      sortableItems = sortableItems.filter(l => 
        l.name?.toLowerCase().includes(s) || 
        l.creatorName?.toLowerCase().includes(s) || 
        String(l.gdLevelId).includes(s)
      );
    }
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [levels, sortConfig, search]);

  const startEdit = (lvl: any) => {
    setEditingId(lvl.id);
    setEditForm({ ...lvl });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        id: editingId,
        placement: editForm.placement ? String(editForm.placement) : '',
        vnPlacement: editForm.vnPlacement ? String(editForm.vnPlacement) : '',
        classicRank: editForm.classicRank ? String(editForm.classicRank) : '',
        minPercent: editForm.minPercent ? String(editForm.minPercent) : '100',
        gdLevelId: String(editForm.gdLevelId),
      };
      const res = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Saved successfully', 'success');
        setEditingId(null);
        fetchLevels();
      } else {
        showToast(data.error || 'Error occurred', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && levels.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-[var(--accent)]" /></div>;

  return (
    <div className="ui-card overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] flex flex-wrap gap-4 justify-between items-center bg-[var(--bg-card)]">
        <h2 className="font-bold ui-title">Level Data Grid</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{ borderColor: 'var(--border-ui)' }}
            />
          </div>
          <div className="text-xs ui-dim">{sortedLevels.length} levels</div>
        </div>
      </div>
      <div className="overflow-auto max-h-[75vh]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 bg-[var(--bg-card)] shadow-sm z-10">
            <tr className="text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('placement')}>Top</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('vnPlacement')}>VN Top</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('classicRank')}>Classic</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('gdLevelId')}>GD ID</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('name')}>Name</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('creatorName')}>Creator</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('mode')}>Mode</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('isVN')}>Is VN</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('isChallenge')}>Challenge</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('difficultyFace')}>Diff</th>
              <th className="p-2 font-bold cursor-pointer" onClick={() => handleSort('ratingType')}>Rating</th>
              <th className="p-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sortedLevels.slice(0, 200).map((lvl) => (
              <tr key={lvl.id} className="hover:bg-[var(--bg-subtle)]">
                {editingId === lvl.id ? (
                  <>
                    <td className="p-1"><input type="number" value={editForm.placement || ''} onChange={e => setEditForm({...editForm, placement: e.target.value ? Number(e.target.value) : null})} className="w-12 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1"><input type="number" value={editForm.vnPlacement || ''} onChange={e => setEditForm({...editForm, vnPlacement: e.target.value ? Number(e.target.value) : null})} className="w-12 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1"><input type="number" value={editForm.classicRank || ''} onChange={e => setEditForm({...editForm, classicRank: e.target.value ? Number(e.target.value) : null})} className="w-12 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1"><input type="text" value={editForm.gdLevelId} onChange={e => setEditForm({...editForm, gdLevelId: e.target.value})} className="w-20 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1"><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-32 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1"><input type="text" value={editForm.creatorName} onChange={e => setEditForm({...editForm, creatorName: e.target.value})} className="w-24 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1">
                      <select value={editForm.mode} onChange={e => setEditForm({...editForm, mode: e.target.value})} className="border rounded text-black dark:text-white bg-transparent px-1 py-1">
                        <option value="CLASSIC">CLASSIC</option>
                        <option value="PLATFORMER">PLATFORMER</option>
                      </select>
                    </td>
                    <td className="p-1 text-center"><input type="checkbox" checked={editForm.isVN} onChange={e => setEditForm({...editForm, isVN: e.target.checked})} /></td>
                    <td className="p-1 text-center"><input type="checkbox" checked={editForm.isChallenge} onChange={e => setEditForm({...editForm, isChallenge: e.target.checked})} /></td>
                    <td className="p-1"><input type="number" value={editForm.difficultyFace} onChange={e => setEditForm({...editForm, difficultyFace: Number(e.target.value)})} className="w-12 px-1 py-1 border rounded text-black dark:text-white bg-transparent" /></td>
                    <td className="p-1">
                      <select value={editForm.ratingType} onChange={e => setEditForm({...editForm, ratingType: e.target.value})} className="border rounded text-black dark:text-white bg-transparent px-1 py-1">
                        <option value="NONE">NONE</option><option value="RATE">RATE</option><option value="FEATURE">FEATURE</option><option value="EPIC">EPIC</option><option value="LEGENDARY">LEGENDARY</option><option value="MYTHIC">MYTHIC</option>
                      </select>
                    </td>
                    <td className="p-1 flex gap-1">
                      <button onClick={saveEdit} disabled={saving} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{lvl.placement || '-'}</td>
                    <td className="p-2 text-red-500 font-bold">{lvl.vnPlacement || '-'}</td>
                    <td className="p-2 text-amber-500">{lvl.classicRank || '-'}</td>
                    <td className="p-2 font-mono">{lvl.gdLevelId}</td>
                    <td className="p-2 font-bold">{lvl.name}</td>
                    <td className="p-2">{lvl.creatorName}</td>
                    <td className="p-2">{lvl.mode}</td>
                    <td className="p-2 text-center">{lvl.isVN ? 'y' : '-'}</td>
                    <td className="p-2 text-center">{lvl.isChallenge ? 'y' : '-'}</td>
                    <td className="p-2">{lvl.difficultyFace}</td>
                    <td className="p-2">{lvl.ratingType}</td>
                    <td className="p-2">
                      <button onClick={() => startEdit(lvl)} className="p-1 hover:bg-[var(--bg-card)] rounded text-[var(--accent)]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
