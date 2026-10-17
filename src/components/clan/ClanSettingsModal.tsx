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
} from 'lucide-react';
import ColorPicker from '@/components/ColorPicker';
import { useToast } from '@/components/GlobalToast';

interface ClanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clan: any;
  onUpdated: (clan: any) => void;
  onDisbanded?: () => void;
  isLeader: boolean;
  isAdminWeb: boolean;
  isOwnerWeb: boolean;
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
}: ClanSettingsModalProps) {
  const { showToast, showConfirm } = useToast();

  const [description, setDescription] = useState(clan.description || '');
  const [avatarUrl, setAvatarUrl] = useState(clan.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(clan.coverUrl || '');
  const [videoUrl, setVideoUrl] = useState(clan.videoUrl || '');
  const [favoriteLevelId, setFavoriteLevelId] = useState(clan.favoriteLevelId || '');
  const [color, setColor] = useState(clan.color || '#f59e0b');

  // Gradient options for Tier 2+
  const isTier2OrHigher = (clan.effectiveSp || 0) > 10;
  const [useTagGradient, setUseTagGradient] = useState(Boolean(clan.colorGradient));
  const [tagGrad1, setTagGrad1] = useState('#f59e0b');
  const [tagGrad2, setTagGrad2] = useState('#ec4899');
  const [tagAngle, setTagAngle] = useState(90);

  // Theme page
  const [themeColor, setThemeColor] = useState(clan.themeColor || '#0ea5e9');
  const [useThemeGradient, setUseThemeGradient] = useState(Boolean(clan.themeGradient));
  const [themeGrad1, setThemeGrad1] = useState('#0ea5e9');
  const [themeGrad2, setThemeGrad2] = useState('#8b5cf6');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = {
        description: description.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        coverUrl: coverUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        favoriteLevelId: favoriteLevelId.trim() || null,
        color: color || null,
      };

      if (isTier2OrHigher) {
        payload.colorGradient = useTagGradient
          ? `linear-gradient(${tagAngle}deg, ${tagGrad1}, ${tagGrad2})`
          : null;
        payload.themeColor = themeColor || null;
        payload.themeGradient = useThemeGradient
          ? `linear-gradient(135deg, ${themeGrad1}, ${themeGrad2})`
          : null;
      }

      const res = await fetch(`/api/clans/${clan.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Cập nhật cài đặt Clan thất bại.');
        return;
      }

      showToast('Đã lưu cài đặt Clan thành công!', 'success');
      onUpdated(data.clan);
      onClose();
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisband = () => {
    showConfirm(
      'Hủy Clan vĩnh viễn? Hành động này không thể hoàn tác. Mọi thành viên sẽ bị giải tán và số SP đóng góp sẽ được hoàn lại.',
      async () => {
        try {
          const res = await fetch(`/api/clans/${clan.slug}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Đã hủy Clan thành công.', 'success');
            onClose();
            if (onDisbanded) onDisbanded();
          } else {
            showToast(data.error || 'Không thể hủy Clan.', 'error');
          }
        } catch {
          showToast('Lỗi máy chủ.', 'error');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
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
              <h2 className="text-base font-bold ui-title">Cài đặt Clan [{clan.tag}]</h2>
              <p className="text-xs ui-dim">Quản lý giao diện, truyền thông và thiết lập</p>
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
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
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
                <Palette className="w-4 h-4 text-amber-400" /> Màu sắc Tag Clan [{clan.tag}]
              </label>
              {isTier2OrHigher ? (
                <div className="flex rounded-lg border p-0.5 bg-black/20 text-xs font-bold" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setUseTagGradient(false)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-all ${
                      !useTagGradient ? 'bg-amber-500 text-black font-bold' : 'ui-dim hover:text-amber-400'
                    }`}
                  >
                    Đơn sắc
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseTagGradient(true)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-all ${
                      useTagGradient ? 'bg-amber-500 text-black font-bold' : 'ui-dim hover:text-amber-400'
                    }`}
                  >
                    Gradient (Tier 2)
                  </button>
                </div>
              ) : (
                <span className="text-[10px] ui-dim font-mono">Gradient mở tại Tier 2 (&gt;10 SP)</span>
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
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="ui-dim">Góc nghiêng:</span>
                  {[0, 45, 90, 135, 180].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setTagAngle(deg)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        tagAngle === deg ? 'bg-amber-500 text-black' : 'ui-subtle'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Tag Preview */}
            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] ui-dim">Xem trước Tag:</span>
              <span
                className="font-black text-sm font-mono tracking-wider"
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
                [{clan.tag}] PlayerName
              </span>
            </div>
          </div>

          {/* Media Links */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Ảnh đại diện (URL / GIF)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... (Hỗ trợ GIF)"
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Ảnh bìa Banner (URL / GIF)
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... (Hỗ trợ GIF)"
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-400" /> Video giới thiệu / Trailer (YouTube Link)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" /> ID màn chơi yêu thích của Clan
              </label>
              <input
                type="text"
                value={favoriteLevelId}
                onChange={(e) => setFavoriteLevelId(e.target.value)}
                placeholder="GD Level ID (vd: 105928421)"
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Mô tả Clan</label>
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giới thiệu đôi nét về Clan của bạn..."
                className="w-full px-3 py-2 rounded-xl text-xs resize-y ui-input"
              />
            </div>
          </div>

          {/* Theme Customization for Clan Page (Tier 2+) */}
          {isTier2OrHigher && (
            <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold ui-title">Màu chủ đạo trang Clan (Theme)</label>
                <div className="flex rounded-lg border p-0.5 bg-black/20 text-xs font-bold" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setUseThemeGradient(false)}
                    className={`px-2 py-0.5 rounded text-[11px] ${!useThemeGradient ? 'bg-sky-500 text-white' : 'ui-dim'}`}
                  >
                    Đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseThemeGradient(true)}
                    className={`px-2 py-0.5 rounded text-[11px] ${useThemeGradient ? 'bg-sky-500 text-white' : 'ui-dim'}`}
                  >
                    Gradient
                  </button>
                </div>
              </div>

              {!useThemeGradient ? (
                <div className="flex items-center gap-3">
                  <ColorPicker value={themeColor} onChange={setThemeColor} size={30} round ariaLabel="Theme Clan" />
                  <span className="font-mono text-xs uppercase">{themeColor}</span>
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Disband Clan Danger Zone (Leader or Web Admin only) */}
          {(isLeader || isAdminWeb || isOwnerWeb) && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-2">
              <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Giải tán Clan
              </h3>
              <p className="text-[11px] ui-dim">
                Chỉ Leader hoặc Quản trị viên hệ thống mới có thể giải tán Clan. Thao tác này sẽ xóa vĩnh viễn Clan.
              </p>
              <button
                type="button"
                onClick={handleDisband}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 transition-colors cursor-pointer"
              >
                Giải tán Clan này
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
