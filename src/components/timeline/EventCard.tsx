'use client';

import { useState } from 'react';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { LaneItem } from '@/lib/timeline/layout';
import { TIMELINE_CARD_LIFT } from '@/lib/timeline/time';

function Media({ event }: { event: ChronicleEvent }) {
  const [failed, setFailed] = useState(false);
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
        zIndex: 6 + Math.round(lift * 14),
      }}
      onClick={() => onOpen(event)}
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
        <Media event={event} />
      </div>
      {side === 'neg' && <div className="card-title">{event.title}</div>}
    </article>
  );
}
