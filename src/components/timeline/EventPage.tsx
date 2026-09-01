'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/timeline/time';
import { sanitizeChronicleHtml } from '@/lib/timeline/sanitize';
import type { ChronicleEvent } from '@/lib/timeline/types';
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
  const html = sanitizeChronicleHtml(event.fullDescription || '');
  const hasEmbed = /<iframe|youtube\.com\/embed/i.test(html);
  const range =
    event.end && event.end > event.start
      ? `${formatDate(event.start)} — ${formatDate(event.end)}`
      : formatDate(event.start);
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onClose(), 200);
  };

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
        <button className="close-page" onClick={requestClose} aria-label={t('timeline.close')}>
          <span>×</span> {t('timeline.close')}
        </button>
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
          <figure className="chronicle-figure">
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
