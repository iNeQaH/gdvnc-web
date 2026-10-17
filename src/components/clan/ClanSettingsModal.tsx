'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Image as ImageIcon,
  Palette,
  Video,
  Heart,
  AlertTriangle,
  Loader2,
  Check,
  Shield,
  Trash2,
  Upload,
  Crown,
  Sparkles,
  Lock,
} from 'lucide-react';
import ColorPicker from '@/components/ColorPicker';
import { CircularAnglePicker } from '@/components/CircularAnglePicker';
import { useToast } from '@/components/GlobalToast';
import { useLanguage } from '@/components/LanguageContext';

interface ClanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clan: any;
  onUpdated: (clan: any) => void;
  onDisbanded?: () => void;
  isLeader: boolean;
  isAdminWeb: boolean;
  isOwnerWeb: boolean;
  onOpenTransfer?: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = String(hex || '').trim().match(/^#?([0-9a-fA-F]{3,8})$/);
  if (!m) return `rgba(14, 165, 233, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `rgba(14, 165, 233, ${alpha})`;
}

export default function ClanSettingsModal({
  isOpen,
  onClose,
  clan,
  onUpdated,
  onDisbanded,
  isLeader,
  isAdminWeb,
  isOwnerWeb,
  onOpenTransfer,
}: ClanSettingsModalProps) {
  const { showToast, showConfirm } = useToast();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [description, setDescription] = useState(clan.description || '');
  const [coverUrl, setCoverUrl] = useState(clan.coverUrl || '');
  const [videoUrl, setVideoUrl] = useState(clan.videoUrl || '');
  const [favoriteLevelId, setFavoriteLevelId] = useState(clan.favoriteLevelId || '');
  const [color, setColor] = useState(clan.color || '#f59e0b');

  // Gradient & Theme options for Tier 2+
  const isTier2OrHigher = Boolean(clan.tier >= 2 || (clan.totalSp || clan.effectiveSp || 0) >= 10);
  const isTier3 = Boolean(clan.tier === 3 || (clan.totalSp || clan.effectiveSp || 0) >= 20);
  const [useTagGradient, setUseTagGradient] = useState(Boolean(clan.colorGradient));
  const [tagGrad1, setTagGrad1] = useState(() => {
    if (clan.colorGradient) {
      const hexes = clan.colorGradient.match(/#([0-9a-fA-F]{3,8})/g);
      if (hexes && hexes[0]) return hexes[0];
    }
    return '#f59e0b';
  });
  const [tagGrad2, setTagGrad2] = useState(() => {
    if (clan.colorGradient) {
      const hexes = clan.colorGradient.match(/#([0-9a-fA-F]{3,8})/g);
      if (hexes && hexes[1]) return hexes[1];
    }
    return '#ec4899';
  });
  const [tagAngle, setTagAngle] = useState(() => {
    if (clan.colorGradient) {
      const match = clan.colorGradient.match(/(\d+)deg/);
      if (match) return parseInt(match[1], 10);
    }
    return 90;
  });

  // Theme page
  const [themeColor, setThemeColor] = useState(() => {
    if (clan.themeColor) {
      const hex = clan.themeColor.match(/#([0-9a-fA-F]{3,8})/);
      if (hex) return hex[0];
    }
    return '#0ea5e9';
  });
  const [useThemeGradient, setUseThemeGradient] = useState(Boolean(clan.themeGradient));
  const [themeGrad1, setThemeGrad1] = useState(() => {
    if (clan.themeGradient) {
      const hexes = clan.themeGradient.match(/#([0-9a-fA-F]{3,8})/g);
      if (hexes && hexes[0]) return hexes[0];
    }
    return '#0ea5e9';
  });
  const [themeGrad2, setThemeGrad2] = useState(() => {
    if (clan.themeGradient) {
      const hexes = clan.themeGradient.match(/#([0-9a-fA-F]{3,8})/g);
      if (hexes && hexes[1]) return hexes[1];
    }
    return '#8b5cf6';
  });
  const [themeAngle, setThemeAngle] = useState(() => {
    if (clan.themeGradient) {
      const match = clan.themeGradient.match(/(\d+)deg/);
      if (match) return parseInt(match[1], 10);
    }
    return 135;
  });

  // Glow controls: toggle on/off & brightness/blur percentage
  const [glowEnabled, setGlowEnabled] = useState(() => {
    const raw = (clan.themeGradient || '') + ' ' + (clan.themeColor || '');
    const match = raw.match(/\/\*glow:(\d+):(\d+)\*\//);
    if (match) return match[1] === '1';
    return true; // Default is ON
  });
  const [glowOpacity, setGlowOpacity] = useState(() => {
    const raw = (clan.themeGradient || '') + ' ' + (clan.themeColor || '');
    const match = raw.match(/\/\*glow:(\d+):(\d+)\*\//);
    if (match) return Math.min(Math.max(parseInt(match[2], 10) || 70, 10), 100);
    return 70; // Default is 70%
  });

  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const uploadedUrl = data.url || data.urls?.[0];
      if (res.ok && uploadedUrl) {
        setCoverUrl(uploadedUrl);
        showToast(isEn ? 'Banner uploaded successfully!' : 'Tải ảnh bìa thành công!', 'success');
      } else {
        showToast(data.error || (isEn ? 'Failed to upload banner.' : 'Tải ảnh thất bại.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Connection error while uploading.' : 'Lỗi kết nối khi tải ảnh.', 'error');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = {
        description: description.trim() || null,
        avatarUrl: null,
        coverUrl: coverUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        favoriteLevelId: favoriteLevelId.trim() || null,
        color: color || null,
        themeColor: themeColor || null,
      };

      const effectiveGlow = isTier3 ? glowEnabled : false;
      const glowSuffix = `/*glow:${effectiveGlow ? 1 : 0}:${glowOpacity}*/`;

      if (isTier2OrHigher) {
        payload.colorGradient = useTagGradient
          ? `linear-gradient(${tagAngle}deg, ${tagGrad1}, ${tagGrad2})`
          : null;
        payload.themeGradient = useThemeGradient
          ? `linear-gradient(${themeAngle}deg, ${themeGrad1}, ${themeGrad2})${glowSuffix}`
          : null;
        payload.themeColor = `${themeColor}${glowSuffix}`;
      } else {
        payload.colorGradient = null;
        payload.themeGradient = null;
        payload.themeColor = `${themeColor}${glowSuffix}`;
      }

      const res = await fetch(`/api/clans/${clan.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || (isEn ? 'Failed to update Clan settings.' : 'Cập nhật cài đặt Clan thất bại.'));
        return;
      }

      showToast(isEn ? 'Clan settings saved successfully!' : 'Đã lưu cài đặt Clan thành công!', 'success');
      onUpdated(data.clan);
      onClose();
    } catch {
      setError(isEn ? 'Server connection error.' : 'Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisband = () => {
    showConfirm(
      isEn
        ? 'Permanently disband this Clan? This action cannot be undone. All members will be removed and donated SP refunded.'
        : 'Hủy Clan vĩnh viễn? Hành động này không thể hoàn tác. Mọi thành viên sẽ bị giải tán và số SP đóng góp sẽ được hoàn lại.',
      async () => {
        try {
          const res = await fetch(`/api/clans/${clan.slug}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(isEn ? 'Clan disbanded successfully.' : 'Đã hủy Clan thành công.', 'success');
            onClose();
            if (onDisbanded) onDisbanded();
          } else {
            showToast(data.error || (isEn ? 'Failed to disband Clan.' : 'Không thể hủy Clan.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Server error.' : 'Lỗi máy chủ.', 'error');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: isTier3 ? 'color-mix(in srgb, var(--accent) 70%, #a855f7)' : 'var(--border-ui)',
          boxShadow: isTier3
            ? '0 0 35px rgba(168, 85, 247, 0.35), 0 0 70px rgba(14, 165, 233, 0.2)'
            : undefined,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold ui-title">
                {isEn ? `Clan Settings [${clan.tag}]` : `Cài đặt Clan [${clan.tag}]`}
              </h2>
              <p className="text-xs ui-dim">
                {isEn ? 'Manage appearance, media, and preferences' : 'Quản lý giao diện, truyền thông và thiết lập'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg ui-dim hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form noValidate onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tag & Color Customization */}
          <div className="p-4 rounded-xl border space-y-3.5" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>{isEn ? `Clan Tag Color [${clan.tag}]` : `Màu sắc Tag Clan [${clan.tag}]`}</span>
              </label>
              {isTier2OrHigher ? (
                <div className="flex rounded-lg border p-0.5 bg-black/20 text-xs font-bold" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setUseTagGradient(false)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                      !useTagGradient ? 'bg-amber-500 text-black font-bold' : 'ui-dim hover:text-amber-400'
                    }`}
                  >
                    {isEn ? 'Solid' : 'Đơn sắc'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseTagGradient(true)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                      useTagGradient ? 'bg-amber-500 text-black font-bold' : 'ui-dim hover:text-amber-400'
                    }`}
                  >
                    Gradient (Tier 2)
                  </button>
                </div>
              ) : (
                <span className="text-[10px] ui-dim font-mono">
                  {isEn ? 'Gradient unlocks at Tier 2 (>10 SP)' : 'Gradient mở tại Tier 2 (>10 SP)'}
                </span>
              )}
            </div>

            {!useTagGradient ? (
              <div className="flex items-center gap-3">
                <ColorPicker value={color} onChange={setColor} size={32} round ariaLabel="Màu Tag" />
                <span className="font-mono text-xs font-bold uppercase">{color}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                    <ColorPicker value={tagGrad1} onChange={setTagGrad1} size={28} round ariaLabel="Màu 1" />
                    <span className="font-mono text-xs uppercase">{tagGrad1}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                    <ColorPicker value={tagGrad2} onChange={setTagGrad2} size={28} round ariaLabel="Màu 2" />
                    <span className="font-mono text-xs uppercase">{tagGrad2}</span>
                  </div>
                </div>
                <CircularAnglePicker
                  value={tagAngle}
                  onChange={setTagAngle}
                  label={isEn ? 'Tag Gradient Angle' : 'Góc xoay Tag'}
                  accentColor="#f59e0b"
                />
              </div>
            )}

            {/* Live Tag Preview */}
            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] ui-dim">
                {isEn ? 'Preview Tag & Name:' : 'Xem trước Tag & Tên thành viên:'}
              </span>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span
                  className="font-black text-sm font-mono tracking-wider inline-block"
                  style={
                    useTagGradient && isTier2OrHigher
                      ? {
                          backgroundImage: `linear-gradient(${tagAngle}deg, ${tagGrad1}, ${tagGrad2})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }
                      : { color }
                  }
                >
                  [{clan.tag}]
                </span>
                <span className="text-sm font-bold text-slate-100">PlayerName</span>
              </div>
            </div>
          </div>

          {/* Media Links */}
          <div className="space-y-3">
            {/* Ảnh bìa Clan: CHỈ TẢI ẢNH LÊN TỪ MÁY, KHÔNG ĐỂ Ô NHẬP URL */}
            <div className="space-y-2">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>{isEn ? 'Clan Cover Banner' : 'Ảnh bìa Clan'}</span>
              </label>

              {coverUrl ? (
                <div
                  className="relative w-full h-32 rounded-xl overflow-hidden border group bg-slate-950 flex items-center justify-center"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md cursor-pointer flex items-center gap-1.5 shadow-md">
                      {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingCover ? (isEn ? 'Uploading...' : 'Đang tải...') : (isEn ? 'Change Banner' : 'Đổi ảnh bìa')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadCover}
                        disabled={uploadingCover}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Remove' : 'Gỡ ảnh'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-sky-500/30 hover:border-sky-400 bg-sky-500/5 hover:bg-sky-500/10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                >
                  {uploadingCover ? (
                    <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                  ) : (
                    <Upload className="w-6 h-6 text-sky-400" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-sky-300">
                      {uploadingCover
                        ? (isEn ? 'Uploading image...' : 'Đang tải ảnh bìa lên...')
                        : (isEn ? 'Upload Clan Cover Banner' : 'Tải ảnh bìa Clan từ thiết bị')}
                    </p>
                    <p className="text-[10px] ui-dim font-medium">
                      {isEn ? 'Supports PNG, JPG, WebP (Max 16MB)' : 'Hỗ trợ định dạng PNG, JPG, WebP (Tối đa 16MB)'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadCover}
                    disabled={uploadingCover}
                  />
                </label>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>{isEn ? 'Intro Video (YouTube)' : 'Video giới thiệu (YouTube)'}</span>
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={isEn ? 'https://youtube.com/watch?v=...' : 'URL video YouTube'}
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span>{isEn ? 'Clan Favorite Level ID' : 'ID màn chơi yêu thích của Clan'}</span>
              </label>
              <input
                type="text"
                value={favoriteLevelId}
                onChange={(e) => setFavoriteLevelId(e.target.value)}
                placeholder={isEn ? 'Geometry Dash Level ID' : 'ID màn chơi'}
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">
                {isEn ? 'Clan Description' : 'Giới thiệu Clan'}
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? 'Introduce your clan, Discord link, rules...' : 'Giới thiệu về Clan của bạn, link Discord, quy định...'}
                className="w-full px-3 py-2 rounded-xl text-xs resize-y ui-input"
              />
            </div>
          </div>

          {/* Theme Customization for Clan Page */}
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isEn ? 'Clan Page Theme Color' : 'Màu chủ đạo trang Clan (Theme)'}</span>
                </label>
                <p className="text-[11px] ui-dim">
                  {isEn ? 'Applies only on the Clan page, does not affect sidebar' : 'Chỉ áp dụng trong trang Clan, không ảnh hưởng sidebar'}
                </p>
              </div>
              {isTier2OrHigher ? (
                <div className="flex rounded-lg border p-0.5 bg-black/20 text-xs font-bold" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setUseThemeGradient(false)}
                    className={`px-2.5 py-0.5 rounded text-[11px] cursor-pointer ${!useThemeGradient ? 'bg-sky-500 text-white' : 'ui-dim'}`}
                  >
                    {isEn ? 'Solid' : 'Đơn'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseThemeGradient(true)}
                    className={`px-2.5 py-0.5 rounded text-[11px] cursor-pointer ${useThemeGradient ? 'bg-sky-500 text-white' : 'ui-dim'}`}
                  >
                    Gradient (Tier 2)
                  </button>
                </div>
              ) : (
                <span className="text-[10px] ui-dim font-mono">
                  {isEn ? 'Gradient unlocks at Tier 2 (>=10 SP)' : 'Gradient mở tại Tier 2 (>=10 SP)'}
                </span>
              )}
            </div>

            {!useThemeGradient || !isTier2OrHigher ? (
              <div className="flex items-center gap-3">
                <ColorPicker value={themeColor} onChange={setThemeColor} size={30} round ariaLabel="Theme Clan" />
                <span className="font-mono text-xs uppercase font-bold">{themeColor}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                    <ColorPicker value={themeGrad1} onChange={setThemeGrad1} size={26} round ariaLabel="Theme Grad 1" />
                    <span className="font-mono text-xs uppercase">{themeGrad1}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                    <ColorPicker value={themeGrad2} onChange={setThemeGrad2} size={26} round ariaLabel="Theme Grad 2" />
                    <span className="font-mono text-xs uppercase">{themeGrad2}</span>
                  </div>
                </div>
                <CircularAnglePicker
                  value={themeAngle}
                  onChange={setThemeAngle}
                  label={isEn ? 'Theme Gradient Angle' : 'Góc xoay Theme'}
                  accentColor="#38bdf8"
                />
              </div>
            )}

            {/* Glow Controls (Tier 3 Only) */}
            <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold">
                    {isEn ? 'Clan Glow Aura' : 'Hiệu ứng Glow Clan'}
                  </span>
                </div>
                {isTier3 ? (
                  <button
                    type="button"
                    onClick={() => setGlowEnabled(!glowEnabled)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      glowEnabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {glowEnabled
                      ? (isEn ? 'Glow: ON' : 'Glow: Bật')
                      : (isEn ? 'Glow: OFF' : 'Glow: Tắt')}
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEn ? 'Requires Tier 3' : 'Cần Cấp 3 (Tier 3)'}
                  </span>
                )}
              </div>

              {isTier3 && glowEnabled ? (
                <div className="space-y-1.5 bg-black/20 p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="ui-dim text-[11px] font-medium">
                      {isEn ? 'Glow Brightness / Opacity' : 'Độ sáng / mờ của Glow'}
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-400">
                      {glowOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={glowOpacity}
                    onChange={(e) => setGlowOpacity(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-400 h-1.5 bg-zinc-700/60 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] ui-dim font-mono">
                    <span>10% ({isEn ? 'Dim' : 'Mờ'})</span>
                    <span>50%</span>
                    <span>100% ({isEn ? 'Bright' : 'Sáng rõ'})</span>
                  </div>
                </div>
              ) : !isTier3 ? (
                <p className="text-[11px] ui-dim italic">
                  {isEn ? 'Reach Tier 3 (20 SP) to unlock ambient Clan Glow.' : 'Clan cần đạt Tier 3 (20 SP) để mở khóa hiệu ứng viền phát sáng Glow.'}
                </p>
              ) : null}
            </div>

            {/* Live Preview of Clan Theme & Glow */}
            <div
              className="w-full h-11 rounded-xl border flex items-center justify-between px-3 text-xs font-mono font-bold transition-all mt-2"
              style={{
                borderColor: 'var(--border-ui)',
                backgroundColor: 'var(--bg-card)',
                boxShadow: !glowEnabled
                  ? 'none'
                  : useThemeGradient && isTier2OrHigher
                  ? (() => {
                      const alpha = (glowOpacity / 100) * 0.7;
                      const blur = Math.round(14 + (glowOpacity / 100) * 16);
                      const rad = (themeAngle * Math.PI) / 180;
                      const ox = Math.round(Math.sin(rad) * 8);
                      const oy = Math.round(-Math.cos(rad) * 8);
                      return `${ox}px ${oy}px ${blur}px 1px ${hexToRgba(themeGrad2, alpha)}, ${-ox}px ${-oy}px ${blur}px 1px ${hexToRgba(themeGrad1, alpha)}, 0 0 ${Math.round(blur * 0.75)}px 2px ${hexToRgba(themeGrad1, alpha * 0.7)}`;
                    })()
                  : `0 0 ${Math.round(14 + (glowOpacity / 100) * 16)}px 2px ${hexToRgba(themeColor, (glowOpacity / 100) * 0.65)}`,
              }}
            >
              <span className="ui-dim text-[11px] flex items-center gap-1.5 font-sans font-bold">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>{isEn ? 'Clan Theme & Glow Preview' : 'Xem thử Glow Clan'}</span>
              </span>
              <span className="text-[10px] ui-dim font-sans font-normal">
                {useThemeGradient && isTier2OrHigher ? `${themeAngle}° Gradient` : (isEn ? 'Solid' : 'Đơn sắc')}{' '}
                <span className={glowEnabled ? 'text-sky-400 font-semibold' : 'text-zinc-500 font-normal'}>
                  ({glowEnabled ? `${glowOpacity}% Glow` : (isEn ? 'Glow OFF' : 'Glow Tắt')})
                </span>
              </span>
            </div>
          </div>

          {/* Transfer Ownership (Leader or Web Owner only) */}
          {(isLeader || isOwnerWeb) && onOpenTransfer && (
            <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>{isEn ? 'Transfer Clan Ownership' : 'Chuyển giao quyền sở hữu Clan'}</span>
              </h3>
              <p className="text-[11px] ui-dim">
                {isEn
                  ? 'Transfer Clan Leadership to another member. You will become a regular member.'
                  : 'Chuyển giao chức vụ Leader tối cao cho thành viên khác trong Clan. Bạn sẽ trở thành thành viên bình thường.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransfer();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:text-black hover:bg-amber-400 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isEn ? 'Transfer Host' : 'Chuyển quyền Leader'}</span>
              </button>
            </div>
          )}

          {/* Disband Clan Danger Zone (Leader or Web Admin only) */}
          {(isLeader || isAdminWeb || isOwnerWeb) && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-2">
              <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Disband Clan' : 'Giải tán Clan'}</span>
              </h3>
              <p className="text-[11px] ui-dim">
                {isEn
                  ? 'Only the Leader or Web Administrator can disband this clan. This action permanently deletes the clan.'
                  : 'Chỉ Leader hoặc Quản trị viên hệ thống mới có thể giải tán Clan. Thao tác này sẽ xóa vĩnh viễn Clan.'}
              </p>
              <button
                type="button"
                onClick={handleDisband}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 transition-colors cursor-pointer"
              >
                {isEn ? 'Disband this Clan' : 'Giải tán Clan này'}
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border hover:opacity-80 transition-opacity cursor-pointer"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              {isEn ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? (isEn ? 'Saving...' : 'Đang lưu...') : (isEn ? 'Save Settings' : 'Lưu cài đặt')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
