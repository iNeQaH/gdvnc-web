'use client';

import React, { useState } from 'react';
import { X, Send, Crown, Users, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/GlobalToast';
import { UserDisplayName } from '@/components/UserDisplayName';

interface JoinClanModalProps {
  isOpen: boolean;
  onClose: () => void;
  clan: {
    id: string;
    slug: string;
    name: string;
    tag: string;
    coverUrl?: string | null;
    description?: string | null;
    color?: string | null;
    colorGradient?: string | null;
    totalSp?: number;
    memberCount?: number;
    maxMembers?: number;
    leader?: any;
  };
  onSuccess: () => void;
}

export default function JoinClanModal({
  isOpen,
  onClose,
  clan,
  onSuccess,
}: JoinClanModalProps) {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/clans/${clan.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể gửi đơn gia nhập.');
        return;
      }

      showToast('Đã gửi đơn xin gia nhập Clan thành công!', 'success');
      onSuccess();
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
          <h2 className="text-base font-bold ui-title">Xin gia nhập Clan</h2>
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

          {/* Clan Preview Card */}
          <div
            className="rounded-xl border overflow-hidden space-y-3"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
          >
            {/* Cover Banner */}
            <div className="h-28 w-full relative bg-slate-900 overflow-hidden">
              {clan.coverUrl ? (
                <img src={clan.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            <div className="p-4 pt-1 space-y-3">
              {/* Clan Tag & Name */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono font-black text-xs px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      ...(clan.colorGradient
                        ? {
                            backgroundImage: clan.colorGradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }
                        : { color: clan.color || '#f59e0b' }),
                    }}
                  >
                    [{clan.tag}]
                  </span>
                  <h3 className="font-bold text-sm ui-title">{clan.name}</h3>
                </div>

                {clan.description && (
                  <p className="text-xs ui-dim leading-relaxed pt-0.5">{clan.description}</p>
                )}
              </div>

              {/* Clan Stats */}
              <div
                className="flex items-center gap-4 text-xs font-semibold pt-2 border-t ui-dim"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {clan.memberCount ?? 0} / {clan.maxMembers ?? 5} thành viên
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{clan.totalSp ?? 0} SP</span>
                </div>
              </div>

              {/* Leader Info */}
              {clan.leader && (
                <div
                  className="p-2.5 rounded-lg border flex items-center gap-2.5 bg-amber-500/5 border-amber-500/20"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 bg-slate-900 shrink-0">
                    {clan.leader.avatarUrl ? (
                      <img src={clan.leader.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-xs">
                        {clan.leader.username?.[0] || 'L'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <UserDisplayName user={clan.leader} showClanTag={false} clanRole="LEADER" />
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Leader Clan
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Join Message Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold ui-title">
              Tin nhắn xin duyệt / Lý do tham gia
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập lời nhắn gửi đến Leader và Ban Quản Trị Clan..."
              className="w-full px-3 py-2 rounded-xl text-xs resize-y ui-input"
            />
            <span className="text-[10px] ui-dim block text-right">{message.length}/200 ký tự</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
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
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Đang gửi...' : 'Gửi đơn gia nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
