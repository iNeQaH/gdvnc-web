'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Pencil, Plus, Trash2, X, Heart, Clock, Vote } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import type { DictKey } from '@/lib/dictionaries';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';
import { handleMarkdownKeyDown, handleMarkdownPaste } from '@/lib/markdownShortcuts';

type Announcement = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  audience: string;
  author: string;
  createdAt: string;
  expiresAt?: string | null;
  likesCount?: number;
  isLiked?: boolean;
  poll?: any;
  targetUserIds?: string[];
};

const AUDIENCES = ['ALL', 'ADMIN', 'MODERATOR', 'SUPPORTER', 'USERS'] as const;

export default function AnnouncementsPage() {
  const { t, language } = useLanguage();
  const { showConfirm, showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const audienceLabel = (audience: string) => {
    const key = `announce.audience.${audience.toLowerCase()}` as DictKey;
    return t(key);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(isAdmin ? '/api/announcements?manage=1' : '/api/announcements');
      const data = await res.json();
      if (data.success) setItems(data.announcements || []);
      else setItems([]);
      const userStr = localStorage.getItem('gdvnc_user');
      if (userStr) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAnnouncements: true }),
        });
        try {
          sessionStorage.removeItem('gdvnc_badges');
        } catch {}
        window.dispatchEvent(new Event('gdvnc_user_update'));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleLikeAnnouncement = async (e: React.MouseEvent, item: Announcement) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thả tim thông báo!', 'error');
      return;
    }
    if (currentUser.isBanned) {
      showToast('Tài khoản bị đình chỉ không thể tương tác!', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/announcements/${item.id}/react`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id ? { ...x, isLiked: data.isLiked, likesCount: data.likesCount } : x
          )
        );
      }
    } catch {}
  };

  const handleDeleteAnnouncement = (item: Announcement) => {
    showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', async () => {
      try {
        const res = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast('Đã xóa thông báo thành công.', 'success');
          load();
        } else {
          showToast(data.error || 'Lỗi khi xóa thông báo.', 'error');
        }
      } catch {
        showToast('Lỗi khi xóa thông báo.', 'error');
      }
    });
  };

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {}
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const locale = language === 'en' ? 'en-US' : 'vi-VN';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black ui-title flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            {t('announce.title')}
          </h1>
          <p className="text-xs ui-dim mt-1">{t('announce.desc')}</p>
        </div>
        {isAdmin && (
          <Link
            href="/announcements/new"
            className="px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 transition-all shadow-sm hover:opacity-95"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('announce.create')}
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-xs ui-dim py-12 text-center">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-1">
          <div className="text-sm font-bold ui-title">{t('announce.empty')}</div>
          <p className="text-xs ui-dim">{t('announce.empty_hint')}</p>
        </div>
      ) : (
        <div className="ui-zebra-list flex flex-col rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border-ui)' }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Link
                href={`/announcements/${item.id}`}
                className="text-left px-4 py-3.5 flex flex-col gap-1 block"
              >
                <div className="flex items-center justify-between gap-2 pr-16 sm:pr-20">
                  <span className="text-sm font-extrabold ui-title truncate">{item.title}</span>
                  <span className="text-[10px] ui-dim shrink-0">
                    {new Date(item.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
                <div className="text-[11px] ui-dim">
                  {t('announce.by')} {item.author} · {audienceLabel(item.audience)}
                </div>
                <p className="text-xs ui-title/80 line-clamp-2 leading-relaxed">{item.excerpt}</p>

                <div className="flex items-center gap-3 pt-2 text-[11px] ui-dim">
                  <button
                    type="button"
                    onClick={(e) => handleLikeAnnouncement(e, item)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      item.isLiked
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 font-bold'
                        : 'hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500'
                    }`}
                    style={{ borderColor: item.isLiked ? undefined : 'var(--border-ui)' }}
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{item.likesCount || 0}</span>
                  </button>

                  {item.poll && (
                    <span className="inline-flex items-center gap-1 text-sky-500 font-medium">
                      <Vote className="w-3.5 h-3.5" />
                      Bình chọn ({item.poll.totalVoters || 0})
                    </span>
                  )}

                  {item.expiresAt && (
                    <span className="inline-flex items-center gap-1 text-amber-500/90 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Hết hạn: {new Date(item.expiresAt).toLocaleDateString(locale)}
                    </span>
                  )}
                </div>
              </Link>

              {isAdmin && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
                  <Link
                    href={`/announcements/new?edit=${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Chỉnh sửa thông báo"
                    className="p-1.5 rounded-lg border ui-dim hover:text-sky-400 hover:border-sky-400/30 transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteAnnouncement(item);
                    }}
                    title="Xóa thông báo"
                    className="p-1.5 rounded-lg border text-red-500/80 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <AnnouncementDetail
          item={selected}
          canEdit={isAdmin}
          t={t}
          locale={locale}
          audienceLabel={audienceLabel}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setCreating(false);
            setSelected(null);
          }}
          onDelete={() => {
            showConfirm(t('announce.delete_confirm'), async () => {
              const res = await fetch(`/api/announcements/${selected.id}`, { method: 'DELETE' });
              if (res.ok) {
                setItems((prev) => prev.filter((x) => x.id !== selected.id));
                setSelected(null);
                showToast(t('common.deleted'));
              }
            });
          }}
        />
      )}

      {(creating || editing) && (
        <AnnouncementForm
          initial={editing}
          t={t}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(row) => {
            setItems((prev) => {
              const next = prev.filter((x) => x.id !== row.id);
              return [row, ...next];
            });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AnnouncementDetail({
  item,
  canEdit,
  t,
  locale,
  audienceLabel,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Announcement;
  canEdit: boolean;
  t: (key: DictKey) => string;
  locale: string;
  audienceLabel: (a: string) => string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border p-5 space-y-3 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-extrabold ui-title text-base">{item.title}</h2>
            <div className="text-[11px] ui-dim mt-1">
              {t('announce.by')} {item.author} · {audienceLabel(item.audience)} ·{' '}
              {new Date(item.createdAt).toLocaleString(locale)}
            </div>
          </div>
          <button
            className="p-1.5 rounded-xl border shrink-0"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            onClick={onClose}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className="p-3.5 rounded-xl border text-sm leading-relaxed ui-title whitespace-pre-wrap max-h-[50vh] overflow-y-auto [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_a]:text-sky-400 [&_a]:underline"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
          dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(item.body) }}
        />
        {canEdit ? (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5"
              style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('announce.edit')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 rounded-xl text-xs font-bold border text-red-500 flex items-center gap-1.5"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('announce.delete')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)]"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('inbox.close')}
          </button>
        )}
      </div>
    </div>
  );
}

function AnnouncementForm({
  initial,
  t,
  onClose,
  onSaved,
}: {
  initial: Announcement | null;
  t: (key: DictKey) => string;
  onClose: () => void;
  onSaved: (row: Announcement) => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '');
  const [body, setBody] = useState(initial?.body || '');
  const [audience, setAudience] = useState(initial?.audience || 'ALL');
  const [usernames, setUsernames] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const payload = useMemo(
    () => ({ title, excerpt, body, audience, usernames }),
    [title, excerpt, body, audience, usernames]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = initial ? `/api/announcements/${initial.id}` : '/api/announcements';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          usernames: audience === 'USERS' && usernames.trim() ? usernames : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('announce.error'));
        return;
      }
      onSaved(data.announcement);
    } catch {
      setError(t('announce.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form
        className="w-full max-w-lg rounded-2xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="font-extrabold ui-title">{initial ? t('announce.edit') : t('announce.create')}</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('announce.field.title')}
          className="w-full px-3 py-2 rounded-xl border text-sm"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          required
        />
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={t('announce.field.excerpt')}
          className="w-full px-3 py-2 rounded-xl border text-sm"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
        />
        <div className="space-y-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => handleMarkdownKeyDown(e, body, setBody)}
            onPaste={(e) => handleMarkdownPaste(e, body, setBody)}
            placeholder={t('announce.field.body')}
            rows={8}
            className="w-full px-3 py-2 rounded-xl border text-sm"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            required
          />
          <div className="text-[10px] ui-dim">Hỗ trợ Discord Markdown & phím tắt Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, paste URL</div>
        </div>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border text-sm font-bold"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {t(`announce.audience.${a.toLowerCase()}` as DictKey)}
            </option>
          ))}
        </select>
        {audience === 'USERS' && (
          <input
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            placeholder={t('announce.field.users')}
            className="w-full px-3 py-2 rounded-xl border text-sm"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            required
          />
        )}
        {error ? <div className="text-xs text-red-500">{error}</div> : null}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl text-xs font-bold ui-dim">
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)]"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
