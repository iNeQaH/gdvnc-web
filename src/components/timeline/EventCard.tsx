'use client';

import { useState } from 'react';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { LaneItem } from '@/lib/timeline/layout';

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
  onOpen,
  onEdit,
  canEdit,
}: {
  item: LaneItem;
  side: 'pos' | 'neg';
  onOpen: (event: ChronicleEvent) => void;
  onEdit: (event: ChronicleEvent) => void;
  canEdit: boolean;
}) {
  const { event } = item;
  const tone = event.nature === 'negative' ? 'neg' : 'pos';

  return (
    <article
      className={`event-card ${tone}`}
      style={{ left: item.left, width: item.width }}
      onClick={() => onOpen(event)}
      onContextMenu={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        onEdit(event);
      }}
    >
      {side === 'pos' && <div className="card-title">{event.title}</div>}
      <div className="card-frame">
        <Media event={event} />
      </div>
      {side === 'neg' && <div className="card-title">{event.title}</div>}
    </article>
  );
}
