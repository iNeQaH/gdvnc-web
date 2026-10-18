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
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import DiscordMarkdown from '@/components/DiscordMarkdown';
import type { DictKey } from '@/lib/dictionaries';

type Announcement = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  audience: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

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

  const handleDelete = () => {
    if (!item) return;
    showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', async () => {
      try {
        const res = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Đã xóa thông báo.');
          router.push('/announcements');
        } else {
          showToast('Lỗi khi xóa thông báo.');
        }
      } catch {
        showToast('Lỗi khi xóa thông báo.');
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all"
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
      </article>
    </div>
  );
}
