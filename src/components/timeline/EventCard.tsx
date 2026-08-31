'use client';

import { useState } from 'react';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { LaneItem } from '@/lib/timeline/layout';
import { TIMELINE_CARD_LIFT, formatDate } from '@/lib/timeline/time';
import { sheetEventMeta } from '@/lib/timeline/sheetEvent';
import type { DictKey } from '@/lib/dictionaries';

function SheetCardDesc({
  event,
  t,
}: {
  event: ChronicleEvent;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  const meta = sheetEventMeta(event);
  if (!meta) {
    return <div className="card-desc">{event.shortDescription}</div>;
  }
  return (
    <div className="card-desc is-sheet">
      {t('timeline.sheet_creator', { name: meta.creator })}
      {'\n'}
      {t('timeline.sheet_id', { id: meta.id })}
      {'\n'}
      {t('timeline.sheet_rated', { date: formatDate(event.start) })}
    </div>
  );
}

function Media({
  event,
  t,
}: {
  event: ChronicleEvent;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  const [failed, setFailed] = useState(false);
  if (sheetEventMeta(event)) return <SheetCardDesc event={event} t={t} />;
  if (!event.image || failed) {
    return <div className="card-desc">{event.shortDescription}</div>;
  }
  return (
    <div className="card-media">
      <img src={event.image} alt="" onError={() => setFailed(true)} />
    </div>
  );
}

export default function EventCard({
  item,
  side,
  scale,
  lift,
  focused,
  ldm,
  onOpen,
  onEdit,
  canEdit,
  t,
}: {
  item: LaneItem;
  side: 'pos' | 'neg';
  scale: number;
  lift: number;
  focused: boolean;
  ldm: boolean;
  onOpen: (event: ChronicleEvent) => void;
  onEdit: (event: ChronicleEvent) => void;
  canEdit: boolean;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  const { event } = item;
  const tone = event.nature === 'negative' ? 'neg' : 'pos';
  const gap = TIMELINE_CARD_LIFT * lift;

  return (
    <article
      className={`event-card ${tone}${focused ? ' is-focus' : ''}`}
      style={{
        left: item.left,
        width: item.width,
        transform: `scale(${scale})`,
        transformOrigin: side === 'pos' ? 'bottom center' : 'top center',
        ...(side === 'pos' ? { bottom: gap } : { top: gap }),
        zIndex: 6,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(event);
      }}
      onContextMenu={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        onEdit(event);
      }}
    >
      {focused && !ldm ? (
        <div className="card-bolt" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {side === 'pos' && <div className="card-title">{event.title}</div>}
      <div className="card-frame">
        <Media event={event} t={t} />
      </div>
      {side === 'neg' && <div className="card-title">{event.title}</div>}
    </article>
  );
}
