'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { LifeBuoy, Send } from 'lucide-react';
import { useEffect } from 'react';

const DISCORD_URL = 'https://discord.gg/AsvCSqP8gb';

export default function HelpsPage() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
  }, []);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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
        body: JSON.stringify({ title, content })
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

  const descParts = t('helps.desc', { url: DISCORD_URL }).split(DISCORD_URL);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 pt-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
          <LifeBuoy className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black drop-shadow-md">{t('helps.title')}</h1>
          <p className="text-sm font-semibold opacity-80 max-w-xl">
            {descParts[0]}
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{DISCORD_URL}</a>
            {descParts[1] || ''}
          </p>
        </div>
      </div>

      <div className="ui-card p-6 rounded-2xl shadow-xl max-w-2xl mx-auto">
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

          {error && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
          {success && <div className="text-emerald-500 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{success}</div>}

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
            <p className="text-center text-xs text-red-400 font-bold mt-2">
              {t('helps.need_login')}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
