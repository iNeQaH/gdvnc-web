'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import type { DictKey } from '@/lib/dictionaries';

type Announcement = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  audience: string;
  author: string;
  createdAt: string;
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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
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
          <button
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('announce.create')}
          </button>
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
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="text-left px-4 py-3.5 flex flex-col gap-1 hover:opacity-90"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold ui-title truncate">{item.title}</span>
                <span className="text-[10px] ui-dim shrink-0">
                  {new Date(item.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
              <div className="text-[11px] ui-dim">
                {t('announce.by')} {item.author} · {audienceLabel(item.audience)}
              </div>
              <p className="text-xs ui-title/80 line-clamp-2 leading-relaxed">{item.excerpt}</p>
            </button>
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
    <div className="announce-overlay" onClick={onClose}>
      <aside className="announce-chronicle" onClick={(e) => e.stopPropagation()}>
        <div className="announce-chronicle-inner">
          <button className="announce-close" onClick={onClose} type="button">
            <X className="w-3.5 h-3.5" /> {t('inbox.close')}
          </button>
          <h2>{item.title}</h2>
          <div className="announce-meta">
            {t('announce.by')} {item.author} · {audienceLabel(item.audience)} ·{' '}
            {new Date(item.createdAt).toLocaleString(locale)}
          </div>
          <div className="announce-body whitespace-pre-wrap">{item.body}</div>
          {canEdit ? (
            <div className="flex gap-2 mt-6">
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
          ) : null}
        </div>
      </aside>
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
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('announce.field.body')}
          rows={8}
          className="w-full px-3 py-2 rounded-xl border text-sm"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          required
        />
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
