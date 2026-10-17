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
      setError('Bạn cần tối thiểu 3 SP coin để tạo Clan (tương đương 3 tháng Supporter hoạt động).');
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
          initialContribution: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Tạo Clan thất bại.');
        return;
      }

      showToast('Đã tạo Clan thành công! (-3 xu SP)', 'success');
      if (data.user) {
        try {
          const current = JSON.parse(localStorage.getItem('gdvnc_user') || '{}');
          const updated = { ...current, ...data.user };
          localStorage.setItem('gdvnc_user', JSON.stringify(updated));
          window.dispatchEvent(new Event('gdvnc_user_update'));
        } catch {}
      }
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
        className="w-full max-w-md rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
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
              <h2 className="text-base font-bold ui-title">Tạo Clan mới</h2>
              <p className="text-xs ui-dim">Yêu cầu tối thiểu 3 SP coin để duy trì</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg ui-dim hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Tên Clan *</label>
              <input
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên Clan"
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
                placeholder="Nhập tag"
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
              <span className="text-[11px] ui-dim">Xem trước hiển thị:</span>
              <span className="text-sm font-bold">
                <span className="text-amber-400 font-black mr-1.5 font-mono">[{tag}]</span>
                <span className="ui-title">{name || 'Clan Name'}</span>
              </span>
            </div>
          )}

          <div
            className="p-3 rounded-xl border text-xs ui-dim space-y-1"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between font-semibold ui-title">
              <span>Phí duy trì mặc định:</span>
              <span className="text-amber-400 font-mono font-bold">3 SP</span>
            </div>
            <p className="text-[11px]">
              Ảnh bìa, mô tả và màu sắc Clan có thể cập nhật trong phần Cài đặt sau khi tạo.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border hover:opacity-80 transition-opacity cursor-pointer"
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
              {loading ? 'Đang tạo...' : 'Tạo Clan (-3 xu SP)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
