import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, Tag, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useToast } from './GlobalToast';
import { DifficultyRatingIcon } from '@/components/DifficultyRatingIcon';
import ColorToggle from './ColorToggle';
import { uploadImagesToUt } from '@/lib/uploadthingClient';

interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: any; // If null, means Add new
  embedded?: boolean;
  submitUrl?: string;
  extraPayload?: Record<string, any>;
  title?: string;
  creatorSubmit?: boolean;
}

export default function LevelFormModal({ isOpen, onClose, onSaved, initialData, embedded, submitUrl, extraPayload, title, creatorSubmit }: LevelFormModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [form, setForm] = useState({
    gdLevelId: '',
    videoUrl: '',
    minPercent: '100',
    placement: '',
    vnPlacement: '',
    mode: 'CLASSIC',
    isVN: false,
    isChallenge: false,
    difficultyFace: 10,
    ratingType: 'NONE' as 'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
  });
  const [saving, setSaving] = useState(false);
  const [fetchingLevel, setFetchingLevel] = useState(false);
  const fetchSeq = useRef(0);
  const skipNextFetchRef = useRef(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [workDesc, setWorkDesc] = useState('');
  const [workImageUrls, setWorkImageUrls] = useState<string[]>([]);
  const [fetchedLevelName, setFetchedLevelName] = useState('');
  const [imageError, setImageError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const fetchGdLevel = async (id: string) => {
    if (!id || !/^\d+$/.test(id)) return;
    const seq = ++fetchSeq.current;
    setFetchingLevel(true);
    try {
      const res = await fetch(`/api/gd/level/${id}`);
      const data = await res.json();
      if (seq !== fetchSeq.current) return;
      if (data.success && data.level) {
        setFetchedLevelName(String(data.level.name || ''));
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
        vnPlacement: initialData.vnPlacement?.toString() || '',
        mode: initialData.mode || 'CLASSIC',
        isVN: initialData.isVN || false,
        isChallenge: initialData.isChallenge || false,
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
        vnPlacement: '',
        mode: 'CLASSIC',
        isVN: false,
        isChallenge: false,
        difficultyFace: 10,
        ratingType: 'NONE',
      });
      setWorkDesc('');
      setWorkImageUrls([]);
      setFetchedLevelName('');
      setImageError('');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const id = form.gdLevelId.trim();
    if (!id || !/^\d+$/.test(id)) {
      setFetchedLevelName('');
      return;
    }
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void fetchGdLevel(id);
    }, 1000);

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
    const sequence: Array<'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'> = [
      'NONE',
      'RATE',
      'FEATURE',
      'EPIC',
      'LEGENDARY',
      'MYTHIC',
    ];
    const idx = sequence.indexOf(form.ratingType);
    setForm({ ...form, ratingType: sequence[(idx + 1) % sequence.length] });
  };

  const handleCreatorImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setImageError('');
    const room = 3 - workImageUrls.length;
    if (room <= 0) {
      setImageError('Tối đa 3 ảnh minh họa.');
      return;
    }
    const incoming = files.slice(0, room);
    if (incoming.find((file) => file.size > 16 * 1024 * 1024)) {
      setImageError('Mỗi ảnh tối đa 16MB.');
      return;
    }
    setUploadingImages(true);
    try {
      const urls = await uploadImagesToUt(incoming);
      setWorkImageUrls((prev) => [...prev, ...urls].slice(0, 3));
    } catch (err: any) {
      setImageError(err?.message || 'Không tải được ảnh lên UploadThing.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSave = async () => {
    if (!creatorSubmit && !form.gdLevelId) {
      showToast(t('admin.need_level_id'), 'error');
      return;
    }
    if (creatorSubmit && !form.gdLevelId.trim() && !workDesc.trim() && workImageUrls.length === 0) {
      showToast(t('submit.creator_need_content'), 'error');
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
          ...(creatorSubmit
            ? {
                description: workDesc.trim(),
                imageUrls: workImageUrls,
                levelName: fetchedLevelName || workDesc.trim().slice(0, 80),
              }
            : {}),
          ...(initialData?.id ? { id: initialData.id } : {}),
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          extraPayload?.type === 'LEVEL' || extraPayload?.type === 'CREATOR'
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
    <>
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
                <DifficultyRatingIcon
                  difficultyFace={form.difficultyFace}
                  ratingType={form.ratingType}
                  className="h-full w-full"
                />
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
                <span className="text-[11px] font-bold uppercase ui-title">{t('filters.tags')}</span>
                <button
                  type="button"
                  onClick={() => setTagsOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {t('tags.button')}
                </button>
              </div>
              {(form.isVN || form.isChallenge) && (
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  {form.isVN && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">VN</span>}
                  {form.isChallenge && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">Challenge</span>}
                </div>
              )}
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
            {form.isVN && !form.isChallenge && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase ui-dim">{t('admin.vn_placement')}</label>
              <input 
                type="number" 
                value={form.vnPlacement}
                onChange={e => setForm({...form, vnPlacement: e.target.value})}
                className="w-full ui-input px-3 py-2 rounded-xl text-xs font-bold"
                placeholder={t('admin.vn_placement_ph')}
              />
            </div>
            )}
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

          </div>

          {creatorSubmit && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">{t('submit.work_desc')}</label>
                <textarea
                  rows={3}
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  placeholder="Quá trình tạo, cảm hứng, collab..."
                  className="w-full ui-input px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase ui-dim">{t('submit.work_images')}</label>
                <div className="relative border-2 border-dashed rounded-xl p-5 text-center" style={{ borderColor: 'var(--border-ui)' }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingImages}
                    onChange={handleCreatorImages}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                  />
                  <div className="flex flex-col items-center gap-1 pointer-events-none">
                    {uploadingImages ? (
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
                    ) : (
                      <ImageIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                    )}
                    <span className="text-[11px] font-bold ui-title">
                      {uploadingImages ? '…' : t('submit.work_images')}
                    </span>
                  </div>
                </div>
                {imageError && <p className="text-[10px] text-red-500">{imageError}</p>}
                {workImageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {workImageUrls.map((img, i) => (
                      <div key={img} className="relative shrink-0">
                        <img src={img} alt="" className="h-16 w-24 rounded-lg object-cover border ui-border" />
                        <button
                          type="button"
                          onClick={() => setWorkImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

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
            disabled={saving || uploadingImages}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? t('common.saving') : (extraPayload?.type === 'LEVEL' || extraPayload?.type === 'CREATOR' ? t('submit.btn_level') : t('common.save'))}
          </button>
        </div>
      </div>
      {tagsOpen && (
        <div
          className="fixed inset-0 z-[100001] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTagsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold ui-title">{t('tags.title')}</h3>
              <button type="button" onClick={() => setTagsOpen(false)} className="p-1.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <ColorToggle pressed={form.isVN} onToggle={() => setForm({ ...form, isVN: !form.isVN })}>
                VN
              </ColorToggle>
              <ColorToggle pressed={form.isChallenge} onToggle={() => setForm({ ...form, isChallenge: !form.isChallenge })}>
                Challenge
              </ColorToggle>
            </div>
            <button
              type="button"
              onClick={() => setTagsOpen(false)}
              className="w-full py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)]"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {t('filters.done')}
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return (
    <>
      {formBody}
    </>
  );

  return (
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {formBody}
    </div>
  );
}
