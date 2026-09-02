'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { formatDate, localizeDateText } from '@/lib/timeline/time';
import { sanitizeChronicleHtml } from '@/lib/timeline/sanitize';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { parseImageRatio, type ChronicleEvent } from '@/lib/timeline/types';
import { chronicleShareText, eventSharePath } from '@/lib/timeline/share';
import type { DictKey } from '@/lib/dictionaries';

export default function EventPage({
  event,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  t,
}: {
  event: ChronicleEvent;
  onClose: () => void;
  onEdit: (event: ChronicleEvent) => void;
  onDelete: (event: ChronicleEvent) => void;
  canEdit: boolean;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const locale = language === 'en' ? 'en' : 'vi';
  const html = localizeDateText(sanitizeChronicleHtml(event.fullDescription || ''), locale);
  const hasEmbed = /<iframe|youtube\.com\/embed/i.test(html);
  const range =
    event.end && event.end > event.start
      ? `${formatDate(event.start, { locale })} — ${formatDate(event.end, { locale })}`
      : formatDate(event.start, { locale });
  const ratio = parseImageRatio(event.imageRatio);
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onClose(), 200);
  };

  async function copyShareUrl(url: string) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('clipboard-timeout')), 1200)),
      ]);
      return true;
    } catch {
      /* fallback */
    }
    try {
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }

  async function shareEvent() {
    const url = `${window.location.origin}${eventSharePath(event.id)}`;
    const title = event.title;
    const text = chronicleShareText(event);
    const copied = await copyShareUrl(url);
    showToast(copied ? t('timeline.share_copied') : url, copied ? 'success' : 'info');
    const native =
      typeof navigator.share === 'function' &&
      (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
    if (!native) return;
    try {
      await Promise.race([
        navigator.share({ title, text, url }),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('share-timeout')), 8000)),
      ]);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  return (
    <div className={`overlay${closing ? ' closing' : ''}`} onClick={requestClose}>
      <aside
        className={`chronicle${closing ? ' closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          if (closing && String(e.animationName).includes('out')) onClose();
        }}
      >
        <span className="chronicle-stroke" aria-hidden />
        <span className="chronicle-corner-glow" aria-hidden />
        <div className="chronicle-tools">
          <button
            type="button"
            className="share-page"
            onClick={shareEvent}
            aria-label={t('timeline.share')}
            title={t('timeline.share')}
          >
            <Share2 className="w-4 h-4" />
            <span>{t('timeline.share')}</span>
          </button>
          <button className="close-page" onClick={requestClose} aria-label={t('timeline.close')}>
            <span>×</span> {t('timeline.close')}
          </button>
        </div>
        <h2>{event.title}</h2>
        <div className="chronicle-meta">{range}</div>
        {html ? (
          <div className="chronicle-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : event.shortDescription ? (
          <p className="chronicle-meta" style={{ marginTop: 18 }}>
            {event.shortDescription}
          </p>
        ) : null}
        {event.image && !hasEmbed ? (
          <figure
            className={`chronicle-figure${ratio ? ' has-ratio' : ''}`}
            style={ratio ? { aspectRatio: String(ratio) } : undefined}
          >
            <img src={event.image} alt={event.title} />
          </figure>
        ) : null}
        {canEdit ? (
          <div className="page-actions">
            <button className="gold-btn" onClick={() => onEdit(event)}>
              {t('timeline.edit')}
            </button>
            <button className="gold-btn ghost" onClick={() => onDelete(event)}>
              {t('timeline.delete')}
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
