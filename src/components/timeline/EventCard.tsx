'use client';

import { useState, type CSSProperties } from 'react';
import type { ChronicleEvent } from '@/lib/timeline/types';
import { CARD_STACK, type LaneItem } from '@/lib/timeline/layout';
import { TIMELINE_CARD_LIFT, formatDate } from '@/lib/timeline/time';
import { sheetEventMeta } from '@/lib/timeline/sheetEvent';
import { glowStyleVars } from '@/lib/timeline/glow';
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
  if (event.image && !failed) {
    return (
      <div className="card-media">
        <img src={event.image} alt="" onError={() => setFailed(true)} />
      </div>
    );
  }
  if (sheetEventMeta(event)) return <SheetCardDesc event={event} t={t} />;
  return <div className="card-desc">{event.shortDescription}</div>;
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
  const gap = TIMELINE_CARD_LIFT * lift + item.stack * CARD_STACK;
  const glow = event.glowColor || '';
  const flow = Boolean(glow) && !ldm;
  const glowVars = glowStyleVars(glow);

  return (
    <article
      className={`event-card ${tone}${focused ? ' is-focus' : ''}${glow ? ' has-glow' : ''}${flow ? ' has-flow' : ''}`}
      style={{
        left: item.left,
        width: item.width,
        transform: `scale(${scale})`,
        transformOrigin: side === 'pos' ? 'bottom center' : 'top center',
        ...(side === 'pos' ? { bottom: gap } : { top: gap }),
        zIndex: 6 + item.stack * 2 + (focused ? 8 : 0),
        ...(glowVars as CSSProperties),
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
      {side === 'pos' && <div className="card-title">{event.title}</div>}
      <div className="card-shell">
        {glow ? <div className="card-glow" aria-hidden /> : null}
        <div className="card-frame">
          <Media event={event} t={t} />
        </div>
      </div>
      {side === 'neg' && <div className="card-title">{event.title}</div>}
    </article>
  );
}
