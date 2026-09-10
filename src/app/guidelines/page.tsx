'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Pencil, Save, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';

export default function GuidelinesPage() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guidelinesHtml, setGuidelinesHtml] = useState('');
  const [guidelinesDraft, setGuidelinesDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {}
    }
    fetch('/api/guidelines')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGuidelinesHtml(data.html || '');
          setGuidelinesDraft(data.html || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveGuidelines = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/guidelines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: guidelinesDraft }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuidelinesHtml(data.html || '');
        setIsEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-ui)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black ui-title flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            {t('nav.guidelines')}
          </h1>
          <p className="text-xs ui-dim mt-1">
            Quy định cộng đồng và các tiêu chuẩn xét duyệt kỷ lục Geometry Dash Việt Nam.
          </p>
        </div>

        {isAdmin && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setGuidelinesDraft(guidelinesHtml);
              setIsEditing(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Sửa Quy Định
          </button>
        )}
      </div>

      {isEditing && isAdmin ? (
        <div className="space-y-3 ui-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold ui-title">Chỉnh sửa nội dung Quy định / Luật (HTML)</h2>
            <span className="text-[11px] ui-dim">Hỗ trợ HTML và embed (iframe)</span>
          </div>
          <textarea
            value={guidelinesDraft}
            onChange={(e) => setGuidelinesDraft(e.target.value)}
            rows={18}
            className="w-full px-4 py-3 rounded-xl border text-xs font-mono focus:outline-none resize-y min-h-[320px]"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setGuidelinesDraft(guidelinesHtml);
                setIsEditing(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={saveGuidelines}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="text-xs ui-dim py-12 text-center">{t('common.loading')}</div>
      ) : guidelinesHtml.trim() ? (
        <article
          className="ui-card p-6 sm:p-8 rounded-2xl shadow-sm text-sm leading-relaxed space-y-4 ui-title [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_a]:text-sky-400 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(guidelinesHtml) }}
        />
      ) : (
        <div className="text-xs ui-dim py-12 text-center">Chưa có nội dung quy định.</div>
      )}
    </div>
  );
}
