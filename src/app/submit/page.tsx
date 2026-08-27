'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle, AlertCircle, Gamepad2, Hammer, Image as ImageIcon, X, Layers, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import LevelFormModal from '@/components/LevelFormModal';
import ReviewStatusBadge from '@/components/ReviewStatusBadge';

function SubmitForm() {
  const router = useRouter();
  const { t } = useLanguage();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Tabs
  const [tab, setTab] = useState<'PLAYER' | 'CREATOR' | 'LEVEL'>('PLAYER');


  // Player state
  const [gdLevelIdStr, setGdLevelIdStr] = useState('');
  const [fetchedLevel, setFetchedLevel] = useState<any>(null);
  const [fetchingLevel, setFetchingLevel] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [progress, setProgress] = useState('100');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [rawProofUrl, setRawProofUrl] = useState('');
  const [hz, setHz] = useState('240');
  const [fps, setFps] = useState('240');
  const [device, setDevice] = useState('PC');
  const [comment, setComment] = useState('');

  // Creator state
  const [workName, setWorkName] = useState(''); // GD Username
  const [workLevelName, setWorkLevelName] = useState(''); // Level Name
  const [workLevelId, setWorkLevelId] = useState('');
  const [workVideoUrl, setWorkVideoUrl] = useState('');
  const [workImagesBase64, setWorkImagesBase64] = useState<string[]>([]);
  const [workDesc, setWorkDesc] = useState('');
  const [imageError, setImageError] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const fetchSeq = useRef(0);

  const loadRecent = async (currentTab: typeof tab) => {
    try {
      const res = await fetch(`/api/submit/mine?type=${currentTab}`);
      const data = await res.json();
      if (data.success) setRecentItems(data.items || []);
    } catch {
      setRecentItems([]);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        fetch(`/api/profile/${u.username}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.user) {
              setCurrentUser(data.user);
            }
          })
          .catch(() => {});
      } catch (e) {}
    }
    setLoadingAuth(false);
  }, []);

  useEffect(() => {
    if (currentUser) void loadRecent(tab);
  }, [tab, currentUser?.id]);

  useEffect(() => {
    const id = gdLevelIdStr.trim();
    if (!id || !/^\d+$/.test(id)) {
      fetchSeq.current += 1;
      setFetchedLevel(null);
      setFetchError('');
      setFetchingLevel(false);
      return;
    }
    const seq = ++fetchSeq.current;
    setFetchingLevel(true);
    setFetchError('');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gd/level/${id}`);
        const data = await res.json();
        if (seq !== fetchSeq.current) return;
        if (data.success) {
          setFetchedLevel(data.level);
        } else {
          setFetchedLevel(null);
          setFetchError(data.error || t('submit.level_fetch_fail'));
        }
      } catch {
        if (seq !== fetchSeq.current) return;
        setFetchedLevel(null);
        setFetchError(t('submit.api_error'));
      } finally {
        if (seq === fetchSeq.current) setFetchingLevel(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [gdLevelIdStr, t]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImageError('');
    const MAX_TOTAL = 20 * 1024 * 1024;
    const estimateBase64Size = (b64: string) => {
      const base64 = b64.includes(',') ? b64.split(',')[1] : b64;
      return Math.ceil(base64.length * 3 / 4);
    };

    const currentTotal = workImagesBase64.reduce((sum, img) => sum + estimateBase64Size(img), 0);
    const incomingTotal = files.reduce((sum, file) => sum + file.size, 0);
    if (currentTotal + incomingTotal > MAX_TOTAL) {
      setImageError('Tổng dung lượng ảnh minh họa tối đa là 20MB.');
      e.target.value = '';
      return;
    }

    let loaded = 0;
    const newImages: string[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) newImages.push(result);
        loaded += 1;
        if (loaded === files.length) {
          setWorkImagesBase64((prev) => {
            const combined = [...prev, ...newImages];
            const total = combined.reduce((sum, img) => sum + estimateBase64Size(img), 0);
            if (total > MAX_TOTAL) {
              setImageError('Tổng dung lượng ảnh minh họa tối đa là 20MB.');
              return prev;
            }
            return combined;
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setError('');
    setLoading(true);

    try {
      let payload: any = {
        type: tab,
        userId: currentUser.id,
      };

      if (tab === 'PLAYER') {
        if (!fetchedLevel) {
          setError(t('submit.fetch_first'));
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          gdLevelId: gdLevelIdStr.trim(),
          levelName: fetchedLevel.name,
          creatorName: fetchedLevel.creatorName,
          isPlatformer: fetchedLevel.isPlatformer,
          videoUrl: videoUrl.trim(),
          rawProofUrl: rawProofUrl.trim(),
          hz: parseInt(hz, 10) || 60,
          fps: parseInt(fps, 10) || null,
          device,
          comment: comment.trim(),
        };

        if (fetchedLevel.isPlatformer) {
          payload.timeMs = Math.round(parseFloat(timeSeconds) * 1000);
        } else {
          payload.progress = parseInt(progress, 10);
        }
      } else {
        if (!workName) {
          setError('Vui lòng điền GD Username.');
          setLoading(false);
          return;
        }
        if (!workLevelName) {
          setError('Vui lòng điền Tên tác phẩm.');
          setLoading(false);
          return;
        }
        
        payload = {
          ...payload,
          username: workName.trim(), 
          levelName: workLevelName.trim(),
          gdLevelId: workLevelId.trim(),
          videoUrl: workVideoUrl.trim(),
          imageUrl: workImagesBase64.length > 0 ? workImagesBase64[0] : '', // for backward compatibility
          imageUrls: workImagesBase64, // pass array of images
          description: workDesc.trim(),
        };
      }

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('submit.fail'));
        return;
      }

      setSuccess(true);
      void loadRecent(tab);
    } catch (err: any) {
      setError(t('common.server_error'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth) return null;

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto ui-card p-12 text-center space-y-4 mt-8">
        <AlertCircle className="w-12 h-12 text-sky-500 mx-auto" />
        <h2 className="text-lg font-bold ui-title">Bạn cần đăng nhập</h2>
        <p className="text-xs ui-dim">Vui lòng đăng nhập để nộp kỷ lục hoặc tác phẩm.</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs inline-flex items-center justify-center mx-auto gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
        >
          Đăng Nhập
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black ui-title tracking-tight">Submit</h1>
        <p className="text-xs ui-dim">{t('submit.page_desc')}</p>
      </div>

      <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
        <button
          onClick={() => setTab('PLAYER')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === 'PLAYER' ? 'shadow-sm' : 'ui-dim hover:opacity-80'}`}
          style={tab === 'PLAYER' ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-title)' } : {}}
        >
          <Gamepad2 className="w-4 h-4" /> {t('submit.tab_player')}
        </button>
        <button
          onClick={() => setTab('CREATOR')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === 'CREATOR' ? 'shadow-sm' : 'ui-dim hover:opacity-80'}`}
          style={tab === 'CREATOR' ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-title)' } : {}}
        >
          <Hammer className="w-4 h-4" /> {t('submit.tab_creator')}
        </button>
        <button
          onClick={() => setTab('LEVEL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === 'LEVEL' ? 'shadow-sm' : 'ui-dim hover:opacity-80'}`}
          style={tab === 'LEVEL' ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-title)' } : {}}
        >
          <Layers className="w-4 h-4" /> {t('submit.tab_level')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-3 space-y-6 min-w-0">
      {success ? (
        <div className="ui-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold ui-title">Đã Gửi Thành Công</h2>
            <p className="text-xs ui-dim">Yêu cầu của bạn đã được gửi cho Ban Quản Trị xét duyệt.</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button 
              onClick={() => setSuccess(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
            >
              Nộp thêm
            </button>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors hover:opacity-80 ui-border"
              style={{ color: 'var(--text-title)' }}
            >
              Về Trang Chủ
            </button>
          </div>
        </div>
      ) : tab === 'LEVEL' ? (
        <div className="space-y-4">
          <LevelFormModal
            isOpen
            embedded
            onClose={() => {}}
            onSaved={() => {
              setSuccess(true);
              void loadRecent('LEVEL');
            }}
            submitUrl="/api/submit"
            extraPayload={{ type: 'LEVEL', userId: currentUser.id }}
            title={t('submit.tab_level')}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl text-xs font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'PLAYER' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl border flex items-start gap-2 ui-subtle ui-border">
                <AlertCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <ul className="text-[11px] ui-dim list-disc list-inside space-y-0.5">
                  <div className="font-bold ui-title">{t('submit.guidelines_title')}</div>
                  <li>{t('submit.guidelines_1')}</li>
                  <li>{t('submit.guidelines_2')}</li>
                </ul>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  {t('submit.level_id')} *
                  {fetchingLevel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                </label>
                <input
                  type="text"
                  required
                  value={gdLevelIdStr}
                  onChange={(e) => setGdLevelIdStr(e.target.value)}
                  placeholder={t('submit.level_id_placeholder')}
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input focus:ring-1 focus:ring-sky-500"
                />
                {fetchError && <p className="text-[10px] text-red-500 pt-1">{fetchError}</p>}
              </div>

              {fetchedLevel && (
                <div className="p-2.5 rounded-xl border flex items-center justify-between text-xs ui-subtle ui-border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold ui-title">{fetchedLevel.name}</span>
                    <span className="ui-dim">by {fetchedLevel.creatorName}</span>
                  </div>
                  <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-card)' }}>
                    {fetchedLevel.isPlatformer ? 'Platformer' : 'Classic'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {fetchedLevel?.isPlatformer ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold ui-title">{t('submit.time_seconds')} *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={timeSeconds}
                      onChange={(e) => setTimeSeconds(e.target.value)}
                      placeholder={t('submit.time_placeholder')}
                      className="w-full px-3 py-2 rounded-xl text-xs ui-input font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold ui-title">{t('submit.progress')} *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.hz')} *</label>
                  <input
                    type="number"
                    required
                    value={hz}
                    onChange={(e) => setHz(e.target.value)}
                    placeholder="60, 144, 240..."
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.fps')} *</label>
                  <input
                    type="number"
                    required
                    value={fps}
                    onChange={(e) => setFps(e.target.value)}
                    placeholder="60, 120, 240..."
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.device')}</label>
                  <select
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                  >
                    <option value="PC">PC</option>
                    <option value="Mobile (iOS)">Mobile (iOS)</option>
                    <option value="Mobile (Android)">Mobile (Android)</option>
                    <option value="Tablet">Tablet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.video_url')} *</label>
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtu.be/..."
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.raw_url')}</label>
                  <input
                    type="url"
                    value={rawProofUrl}
                    onChange={(e) => setRawProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold ui-title">{t('submit.comment')}</label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Attempts, timestamps, notes..."
                    className="w-full px-3 py-2 rounded-xl text-xs ui-input resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {tab === 'CREATOR' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">GD Username *</label>
                <input
                  type="text"
                  required
                  value={workName}
                  onChange={(e) => setWorkName(e.target.value)}
                  placeholder="Ví dụ: Viprin, Zobros..."
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">Tên tác phẩm *</label>
                <input
                  type="text"
                  required
                  value={workLevelName}
                  onChange={(e) => setWorkLevelName(e.target.value)}
                  placeholder="Ví dụ: Bloodbath, Nine Circles..."
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">Level ID (Tùy chọn)</label>
                <input
                  type="text"
                  value={workLevelId}
                  onChange={(e) => setWorkLevelId(e.target.value)}
                  placeholder="10565740"
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">Link Video Showcase (Tùy chọn)</label>
                <input
                  type="url"
                  value={workVideoUrl}
                  onChange={(e) => setWorkVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">Ảnh Minh Họa (Tổng tối đa 20MB, Tùy chọn)</label>
                <div className="relative border-2 border-dashed rounded-xl p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-center group" style={{ borderColor: 'var(--border-ui)' }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <ImageIcon className="w-8 h-8 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold ui-title">Nhấn để chọn nhiều ảnh</span>
                    <span className="text-[10px] ui-dim">Có thể tải nhiều ảnh — tổng dung lượng tối đa 20MB</span>
                  </div>
                </div>
                {imageError && <p className="text-[10px] text-red-500 pt-1">{imageError}</p>}
                
                {workImagesBase64.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-bold mb-2">Đã chọn {workImagesBase64.length} ảnh:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {workImagesBase64.map((img, i) => (
                        <div key={i} className="relative shrink-0">
                          <img src={img} alt={`Preview ${i+1}`} className="h-20 w-32 rounded-xl object-cover border ui-border" />
                          <button 
                            type="button"
                            onClick={() => setWorkImagesBase64(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold ui-title">Mô tả thêm</label>
                <textarea
                  rows={3}
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  placeholder="Quá trình tạo, cảm hứng, collab..."
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input resize-none"
                ></textarea>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? t('submit.submitting') : 'Gửi Lên'}
          </button>
        </form>
      )}
      </div>
      <aside className="lg:col-span-2 ui-card p-4 space-y-3 order-last">
        <h3 className="text-xs font-black uppercase ui-title">{t('submit.recent')}</h3>
        {recentItems.length === 0 ? (
          <p className="text-[11px] ui-dim">{t('submit.recent_empty')}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {recentItems.map((item) => (
              <div key={item.id} className="p-2.5 rounded-xl border ui-subtle flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold ui-title truncate">
                    {item.levelName || `ID ${item.gdLevelId || ''}`}
                  </div>
                  <div className="text-[10px] ui-dim">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ''}
                  </div>
                </div>
                <ReviewStatusBadge status={item.status} t={t} />
              </div>
            ))}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center ui-dim text-xs">Loading...</div>}>
      <SubmitForm />
    </Suspense>
  );
}
