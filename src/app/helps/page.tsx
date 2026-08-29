'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Send } from 'lucide-react';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';

const DISCORD_URL = 'https://discord.gg/AsvCSqP8gb';

export default function HelpsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'faq' | 'submit'>('faq');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [faqHtml, setFaqHtml] = useState('');
  const [faqDraft, setFaqDraft] = useState('');
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqSaving, setFaqSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {}
    }
    fetch('/api/faq')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFaqHtml(data.html || '');
          setFaqDraft(data.html || '');
        }
      })
      .catch(() => {})
      .finally(() => setFaqLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError(t('helps.need_login'));
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError(t('helps.fill_all'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/helps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('helps.ok'));
        setTitle('');
        setContent('');
      } else {
        setError(data.error || t('helps.error'));
      }
    } catch {
      setError(t('helps.network'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveFaq = async () => {
    setFaqSaving(true);
    try {
      const res = await fetch('/api/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: faqDraft }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqHtml(data.html || '');
        setEditingFaq(false);
      }
    } finally {
      setFaqSaving(false);
    }
  };

  const descParts = t('helps.desc', { url: DISCORD_URL }).split(DISCORD_URL);
  const tabBtn = (id: 'faq' | 'submit', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
      style={{
        backgroundColor: tab === id ? 'var(--bg-card)' : 'transparent',
        color: tab === id ? 'var(--accent)' : 'var(--text-dim)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-black drop-shadow-md">{t('helps.title')}</h1>
        <p className="text-sm font-semibold opacity-80 max-w-xl mt-1">
          {descParts[0]}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
            {DISCORD_URL}
          </a>
          {descParts[1] || ''}
        </p>
      </div>

      <div
        className="inline-flex items-center gap-1 p-0.5 rounded-xl border"
        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
      >
        {tabBtn('faq', t('helps.tab_faq'))}
        {tabBtn('submit', t('helps.tab_submit'))}
      </div>

      {tab === 'faq' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {editingFaq ? (
                <>
                  <button
                    type="button"
                    onClick={saveFaq}
                    disabled={faqSaving}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    {faqSaving ? t('helps.faq_saving') : t('helps.faq_save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFaqDraft(faqHtml);
                      setEditingFaq(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    style={{ border: '1px solid var(--border-ui)', color: 'var(--text-dim)' }}
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFaqDraft(faqHtml);
                    setEditingFaq(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  {t('helps.faq_edit')}
                </button>
              )}
            </div>
          )}

          {editingFaq && isAdmin ? (
            <div className="space-y-2">
              <p className="text-[11px] ui-dim">{t('helps.faq_hint')}</p>
              <textarea
                value={faqDraft}
                onChange={(e) => setFaqDraft(e.target.value)}
                rows={18}
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none resize-y min-h-[320px]"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              />
            </div>
          ) : faqLoading ? (
            <div className="text-sm ui-dim">{t('helps.faq_loading')}</div>
          ) : faqHtml.trim() ? (
            <article
              className="faq-body ui-card p-5 sm:p-8 rounded-2xl text-sm leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(faqHtml) }}
            />
          ) : (
            <div className="ui-card p-8 rounded-2xl text-sm ui-dim text-center">{t('helps.faq_empty')}</div>
          )}
        </div>
      )}

      {tab === 'submit' && (
        <div className="ui-card p-6 rounded-2xl shadow-xl max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase ui-dim mb-2">{t('helps.field_title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('helps.title_ph')}
                disabled={!currentUser || isSubmitting}
                className="w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase ui-dim mb-2">{t('helps.field_content')}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('helps.content_ph')}
                disabled={!currentUser || isSubmitting}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-y"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>
            )}
            {success && (
              <div className="text-emerald-500 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={!currentUser || isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {isSubmitting ? t('helps.submitting') : t('helps.submit')}
              <Send className="w-4 h-4" />
            </button>
            {!currentUser && (
              <p className="text-center text-xs text-red-400 font-bold mt-2">{t('helps.need_login')}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
