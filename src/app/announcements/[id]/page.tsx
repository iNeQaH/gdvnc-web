'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Calendar,
  User,
  Share2,
  Pencil,
  Trash2,
  Check,
  Shield,
  Loader2,
  Copy,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import DiscordMarkdown from '@/components/DiscordMarkdown';
import { AnnouncementPoll } from '@/components/AnnouncementPoll';
import { Heart, Clock } from 'lucide-react';
import type { DictKey } from '@/lib/dictionaries';
import { isSuperAdminUser } from '@/lib/roles';

type Announcement = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  audience: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string | null;
  likesCount?: number;
  isLiked?: boolean;
  poll?: any;
  targetUserIds?: string[];
};

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t, language } = useLanguage();
  const { showToast, showConfirm } = useToast();

  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdmin = Boolean(currentUser && (currentUser.role === 'ADMIN' || isSuperAdminUser(currentUser)));

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/announcements/${id}`);
        const data = await res.json();
        if (res.ok && data.success && data.announcement) {
          setItem(data.announcement);
        } else {
          setError(data.error || 'Không tìm thấy thông báo.');
        }
      } catch {
        setError('Lỗi khi tải thông báo.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  const audienceLabel = (aud: string) => {
    const key = `announce.audience.${aud.toLowerCase()}` as DictKey;
    const label = t(key);
    return label.startsWith('announce.audience') ? aud : label;
  };

  const handleLike = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thả tim thông báo!', 'error');
      return;
    }
    if (currentUser.isBanned) {
      showToast('Tài khoản bị đình chỉ không thể tương tác!', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/announcements/${id}/react`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setItem((prev: any) => prev ? { ...prev, isLiked: data.isLiked, likesCount: data.likesCount } : prev);
      }
    } catch {}
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast('Đã sao chép liên kết thông báo!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép liên kết.');
    }
  };

  const handleCopyMarkdown = async () => {
    if (!item?.body) return;
    try {
      await navigator.clipboard.writeText(item.body);
      setCopiedFormat(true);
      showToast('Đã sao chép nội dung định dạng thông báo!', 'success');
      setTimeout(() => setCopiedFormat(false), 2000);
    } catch {
      showToast('Không thể sao chép nội dung.', 'error');
    }
  };

  const handleDelete = () => {
    if (!item) return;
    showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', async () => {
      try {
        const res = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Đã xóa thông báo thành công.', 'success');
          router.push('/announcements');
        } else {
          showToast(data.error || 'Lỗi khi xóa thông báo.', 'error');
        }
      } catch {
        showToast('Lỗi khi xóa thông báo.', 'error');
      }
    });
  };

  const locale = language === 'en' ? 'en-US' : 'vi-VN';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span className="text-xs ui-dim">{t('common.loading')}</span>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="text-base font-bold text-red-400">{error || 'Không tìm thấy thông báo.'}</div>
        <Link
          href="/announcements"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách thông báo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ui-dim hover:text-white hover:border-white/20 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('announce.title')}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
            title="Sao chép liên kết"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
            title="Sao chép nội dung định dạng (Markdown)"
          >
            {copiedFormat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFormat ? 'Đã chép mã' : 'Sao chép mã'}</span>
          </button>

          {isAdmin && (
            <>
              <Link
                href={`/announcements/new?edit=${item.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all text-amber-400 hover:bg-amber-400/10"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Announcement Card */}
      <article
        className="ui-card p-6 sm:p-8 rounded-3xl border space-y-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        {/* Header Details */}
        <div className="space-y-3 border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-xs"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Bell className="w-3 h-3" />
              {audienceLabel(item.audience)}
            </span>

            <span className="text-xs ui-dim flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(item.createdAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {item.expiresAt && (
              <span className="text-xs text-amber-500 font-semibold flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <Clock className="w-3 h-3" />
                Hết hạn: {new Date(item.expiresAt).toLocaleDateString(locale)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black ui-title leading-snug tracking-tight">
            {item.title}
          </h1>

          <div className="flex items-center gap-2 text-xs ui-dim pt-1">
            <User className="w-3.5 h-3.5" />
            <span>
              {t('announce.by')} <strong className="text-[color:var(--text-title)]">{item.author}</strong>
            </span>
          </div>
        </div>

        {/* Announcement Body rendered with Discord Markdown */}
        <div className="prose max-w-none text-sm leading-relaxed ui-title">
          <DiscordMarkdown content={item.body} />
        </div>

        {/* Interactive Poll (if attached) */}
        {item.poll && (
          <AnnouncementPoll
            announcementId={item.id}
            poll={item.poll}
            onVoteSuccess={(updatedPoll) => {
              setItem((prev: any) => prev ? { ...prev, poll: updatedPoll } : prev);
            }}
          />
        )}

        {/* Heart Reaction Footer */}
        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              item.isLiked
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 shadow-sm'
                : 'hover:bg-rose-500/10 hover:border-rose-500/30 ui-dim hover:text-rose-500'
            }`}
            style={{ borderColor: item.isLiked ? undefined : 'var(--border-ui)' }}
          >
            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${item.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{item.likesCount || 0}</span>
          </button>
        </div>
      </article>
    </div>
  );
}
