import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useToast } from './GlobalToast';
import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';

interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: any; // If null, means Add new
  embedded?: boolean;
  submitUrl?: string;
  extraPayload?: Record<string, any>;
  title?: string;
}

export default function LevelFormModal({ isOpen, onClose, onSaved, initialData, embedded, submitUrl, extraPayload, title }: LevelFormModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [form, setForm] = useState({
    gdLevelId: '',
    videoUrl: '',
    minPercent: '100',
    placement: '',
    mode: 'CLASSIC',
    isVN: false,
    difficultyFace: 10,
    ratingType: 'NONE' as 'NONE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
  });
  const [saving, setSaving] = useState(false);
  const [fetchingLevel, setFetchingLevel] = useState(false);
  const fetchSeq = useRef(0);
  const skipNextFetchRef = useRef(false);

  const fetchGdLevel = async (id: string) => {
    if (!id || !/^\d+$/.test(id)) return;
    const seq = ++fetchSeq.current;
    setFetchingLevel(true);
    try {
      const res = await fetch(`/api/gd/level/${id}`);
      const data = await res.json();
      if (seq !== fetchSeq.current) return;
      if (data.success && data.level) {
        setForm((prev) => {
          if (prev.gdLevelId.trim() !== id) return prev;
          return {
            ...prev,
            difficultyFace: data.level.difficultyFace ?? prev.difficultyFace,
            ratingType: data.level.ratingType || prev.ratingType,
            mode: data.level.isPlatformer ? 'PLATFORMER' : 'CLASSIC',
          };
        });
      }
    } catch {
      // Keep manual values if GD lookup fails
    } finally {
      if (seq === fetchSeq.current) setFetchingLevel(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      fetchSeq.current++;
      setFetchingLevel(false);
      return;
    }

    if (initialData) {
      const gdId = initialData.gdLevelId?.toString() || '';
      setForm({
        gdLevelId: gdId,
        videoUrl: initialData.videoUrl || (initialData.youtubeId ? `https://youtube.com/watch?v=${initialData.youtubeId}` : ''),
        minPercent: initialData.minPercent?.toString() || '100',
        placement: initialData.placement?.toString() || '',
        mode: initialData.mode || 'CLASSIC',
        isVN: initialData.isVN || false,
        difficultyFace: initialData.difficultyFace ?? 10,
        ratingType: initialData.ratingType || 'NONE',
      });
      if (gdId && /^\d+$/.test(gdId)) {
        skipNextFetchRef.current = true;
        void fetchGdLevel(gdId);
      }
    } else {
      setForm({
        gdLevelId: '',
        videoUrl: '',
        minPercent: '100',
        placement: '',
        mode: 'CLASSIC',
        isVN: false,
        difficultyFace: 10,
        ratingType: 'NONE',
      });
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const id = form.gdLevelId.trim();
    if (!id || !/^\d+$/.test(id)) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void fetchGdLevel(id);
    }, 400);

    return () => clearTimeout(timer);
  }, [form.gdLevelId, isOpen]);

  if (!isOpen) return null;

  const cycleDifficulty = (delta: number) => {
    const sequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const idx = sequence.indexOf(form.difficultyFace);
    const current = idx >= 0 ? idx : 0;
    const next = Math.min(sequence.length - 1, Math.max(0, current + delta));
    setForm({ ...form, difficultyFace: sequence[next] });
  };

  const cycleRating = () => {
    const sequence: Array<'NONE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'> = ['NONE', 'FEATURE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
    const idx = sequence.indexOf(form.ratingType);
    setForm({ ...form, ratingType: sequence[(idx + 1) % sequence.length] });
  };

  const getRatingIcon = () => getRatingIconUrl(form.ratingType);

  const getFaceIcon = () => getDifficultyFaceUrl(form.difficultyFace);

  const handleSave = async () => {
    if (!form.gdLevelId) {
      showToast(t('admin.need_level_id'), 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(submitUrl || '/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(extraPayload || {}),
          ...form,
          ...(initialData?.id ? { id: initialData.id } : {}),
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          extraPayload?.type === 'LEVEL'
            ? t('submit.level_ok')
            : t('admin.add_ok', { name: data.level?.name || 'Level' }),
          'success'
        );
        onSaved();
        onClose();
      } else {
        showToast(data.error, 'error');
      }
    } catch (e) {
      showToast(t('common.network_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const formBody = (
      <div
        className={embedded ? 'w-full rounded-3xl border p-6 space-y-5' : 'w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-5'}
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="font-extrabold text-lg ui-title flex items-center gap-2">
            {title || (initialData ? t('editor.save') + ' Level' : t('admin.add_update'))}
          </h2>
          {!embedded && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border hover:opacity-80 transition-colors"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            <X className="w-4 h-4" />
          </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            {/* Difficulty + Rating cycler */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 relative cursor-pointer hover:scale-105 transition-transform"
                onClick={cycleRating}
                title="Click để đổi Rating (Feature, Epic...)"
              >
                {fetchingLevel && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
                {form.ratingType !== 'NONE' && getRatingIcon() && (
                  <img src={getRatingIcon() as string} className="absolute inset-0 w-full h-full object-contain" alt={form.ratingType} />
                )}
                <img src={getFaceIcon()} className="absolute inset-0 w-full h-full object-contain z-10" alt="Difficulty" />
              </div>
              
              <div className="flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border-ui)] rounded-lg p-1">
                <button 
                  onClick={() => cycleDifficulty(-1)}
                  className="px-2 font-black hover:bg-[var(--accent)] hover:text-[color:var(--accent-fg)] rounded"
                >-</button>
                <span className="text-[10px] font-bold min-w-4 text-center">{form.difficultyFace}</span>
                <button 
                  onClick={() => cycleDifficulty(1)}
                  className="px-2 font-black hover:bg-[var(--accent)] hover:text-[color:var(--accent-fg)] rounded"
                >+</button>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1.5">
                  Level ID
                  {fetchingLevel && <Loader2 className="w-3 h-3 animate-spin" />}
                </label>
                <input 
                  type="number" 
                  value={form.gdLevelId}
                  onChange={e => setForm({...form, gdLevelId: e.target.value})}
                  className="w-full ui-input px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="VD: 10565740"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl border ui-subtle">
                <label className="text-[11px] font-bold uppercase ui-title">Level của người Việt (Vietnam)</label>
                <input 
                  type="checkbox"
                  checked={form.isVN}
                  onChange={e => setForm({...form, isVN: e.target.checked})}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase ui-dim">Vị trí (Top)</label>
              <input 
                type="number" 
                value={form.placement}
                onChange={e => setForm({...form, placement: e.target.value})}
                className="w-full ui-input px-3 py-2 rounded-xl text-xs font-bold"
                placeholder="Không xếp hạng"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase ui-dim">{t('admin.min_percent')}</label>
              <input 
                type="number" 
                value={form.minPercent}
                onChange={e => setForm({...form, minPercent: e.target.value})}
                className="w-full ui-input px-3 py-2 rounded-xl text-xs font-bold"
                placeholder="VD: 100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase ui-dim">Link Video Showcase</label>
            <input 
              type="text" 
              value={form.videoUrl}
              onChange={e => setForm({...form, videoUrl: e.target.value})}
              className="w-full ui-input px-3 py-2 rounded-xl text-xs font-bold"
              placeholder="https://youtu.be/..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase ui-dim">Loại danh sách</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setForm({...form, mode: 'CLASSIC'})}
                className={`py-2 text-xs font-bold rounded-xl border transition-colors ${form.mode === 'CLASSIC' ? 'bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]' : 'bg-[var(--bg-subtle)] border-[var(--border-ui)]'}`}
              >Classic</button>
              <button
                onClick={() => setForm({...form, mode: 'PLATFORMER'})}
                className={`py-2 text-xs font-bold rounded-xl border transition-colors ${form.mode === 'PLATFORMER' ? 'bg-[var(--accent)] text-[color:var(--accent-fg)] border-[var(--accent)]' : 'bg-[var(--bg-subtle)] border-[var(--border-ui)]'}`}
              >Platformer</button>
            </div>
          </div>

        </div>

        <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
          {!embedded && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          >
            {t('common.cancel')}
          </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? t('common.saving') : (extraPayload?.type === 'LEVEL' ? t('submit.btn_level') : t('common.save'))}
          </button>
        </div>
      </div>
  );

  if (embedded) return formBody;

  return (
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {formBody}
    </div>
  );
}
