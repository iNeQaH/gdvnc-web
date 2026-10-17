'use client';

import React, { useState } from 'react';
import { X, Shield, Sparkles, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';

interface CreateClanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (clan: any) => void;
  userSp: number;
}

export default function CreateClanModal({
  isOpen,
  onClose,
  onCreated,
  userSp,
}: CreateClanModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [spContribution, setSpContribution] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setTag(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập tên Clan.');
      return;
    }
    if (!tag.trim() || tag.trim().length > 4) {
      setError('Tag Clan phải từ 1 đến 4 ký tự.');
      return;
    }
    if (userSp < 3) {
      setError('Bạn cần tối thiểu 3 SP coin để thành lập Clan (3 tháng Supporter hoạt động).');
      return;
    }
    if (spContribution < 3 || spContribution > userSp) {
      setError(`Số SP đóng góp phải từ 3 đến ${userSp} SP coin.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tag: tag.trim(),
          description: description.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          coverUrl: coverUrl.trim() || null,
          initialContribution: spContribution,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Thành lập Clan thất bại.');
        return;
      }

      showToast('Đã thành lập Clan thành công!', 'success');
      onCreated(data.clan);
      onClose();
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold ui-title">Thành lập Clan mới</h2>
              <p className="text-xs ui-dim">Yêu cầu tối thiểu 3 SP coin để duy trì</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SP Coin Info Bar */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
          >
            <span className="flex items-center gap-1.5 ui-dim">
              <Coins className="w-4 h-4 text-amber-400" /> SP coin khả dụng của bạn:
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">{userSp} SP</span>
          </div>

          {/* Name & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold ui-title">Tên Clan *</label>
              <input
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Geo Dat Viet"
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Tag viết tắt *</label>
              <input
                type="text"
                required
                maxLength={4}
                value={tag}
                onChange={handleTagChange}
                placeholder="VD: GDV"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase ui-input"
              />
              <span className="text-[10px] ui-dim">Tối đa 4 ký tự</span>
            </div>
          </div>

          {/* Tag Preview */}
          {tag && (
            <div
              className="p-3 rounded-xl border flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-[11px] ui-dim">Xem trước Tag trong game & web:</span>
              <span className="text-sm font-bold">
                <span className="text-amber-400 font-black mr-1.5 font-mono">[{tag}]</span>
                <span className="ui-title">{name || 'Clan Name'}</span>
              </span>
            </div>
          )}

          {/* Initial Contribution */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold ui-title flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Quyên góp SP ban đầu (Tối thiểu 3) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={Math.max(3, userSp)}
                value={spContribution}
                onChange={(e) => setSpContribution(parseInt(e.target.value, 10) || 3)}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400">
                {spContribution} SP
              </span>
            </div>
            <span className="text-[10px] ui-dim">
              SP coin đóng góp được tính dựa trên số tháng Supporter còn hạn và sẽ tự động thu hồi khi hết hạn.
            </span>
          </div>

          {/* Avatar & Cover URL */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Ảnh đại diện Clan (URL / GIF)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... (Hỗ trợ GIF)"
                className="w-full px-3 py-2 rounded-xl text-xs ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Ảnh bìa Clan (URL / GIF)</label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... (Hỗ trợ GIF)"
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

          {/* Footer Actions */}
          <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || userSp < 3}
              className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Đang tạo...' : 'Thành lập Clan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
