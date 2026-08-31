'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/timeline/time';
import { sanitizeChronicleHtml } from '@/lib/timeline/sanitize';
import { sheetEventMeta } from '@/lib/timeline/sheetEvent';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { DictKey } from '@/lib/dictionaries';

function splitParagraphs(html: string) {
  if (!html) return [];
  const parts = html
    .split(/<\/p>/i)
    .map((chunk) => chunk.replace(/<p[^>]*>/i, '').trim())
    .filter(Boolean);
  if (parts.length) return parts;
  return html.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

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
  const sheet = sheetEventMeta(event);
  const paras = splitParagraphs(event.fullDescription).filter((p) => {
    if (!sheet) return true;
    return !/^ID\s+\d+$/i.test(p.replace(/<[^>]+>/g, '').trim());
  });
  const mid = Math.max(1, Math.ceil(paras.length / 2));
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
        {sheet ? (
          <p className="chronicle-meta sheet-meta">
            {t('timeline.sheet_creator', { name: sheet.creator })}
            {'\n'}
            {t('timeline.sheet_id', { id: sheet.id })}
            {'\n'}
            {t('timeline.sheet_rated', { date: formatDate(event.start) })}
          </p>
        ) : null}
        <div className="chronicle-body">
          {paras.slice(0, mid).map((p, i) => (
            <p key={`a-${i}`} dangerouslySetInnerHTML={{ __html: sanitizeChronicleHtml(p) }} />
          ))}
          {event.image ? (
            <figure className="chronicle-figure">
              <img src={event.image} alt={event.title} />
            </figure>
          ) : null}
          {paras.slice(mid).map((p, i) => (
            <p key={`b-${i}`} dangerouslySetInnerHTML={{ __html: sanitizeChronicleHtml(p) }} />
          ))}
        </div>
        {event.shortDescription && !sheet ? (
          <p className="chronicle-meta" style={{ marginTop: 18 }}>
            {event.shortDescription}
          </p>
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
