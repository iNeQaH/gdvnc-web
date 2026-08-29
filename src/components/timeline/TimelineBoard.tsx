'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAY_MS,
  pxPerDayAt,
  eventIsPeriodLine,
  eventSpan,
  clampCenter,
} from '@/lib/timeline/time';
import { clusterCollapsed, layoutLane, type LaneItem } from '@/lib/timeline/layout';
import EventCard from '@/components/timeline/EventCard';
import type { ChronicleEvent, TimelineTierId } from '@/lib/timeline/types';
import type { DictKey } from '@/lib/dictionaries';

const TIER_KEYS: Record<TimelineTierId, DictKey> = {
  '5y': 'timeline.tier.5y',
  '1y': 'timeline.tier.1y',
  '6m': 'timeline.tier.6m',
  '1m': 'timeline.tier.1m',
  week: 'timeline.tier.week',
  day: 'timeline.tier.day',
};

type Prepared = ChronicleEvent & {
  anchor: number;
  span: ReturnType<typeof eventSpan>;
};

export default function TimelineBoard({
  events,
  zoom,
  setZoom,
  center,
  setCenter,
  expandedIds,
  setExpandedIds,
  onOpen,
  onEdit,
  canEdit,
  t,
}: {
  events: ChronicleEvent[];
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  center: number;
  setCenter: (c: number | ((prev: number) => number)) => void;
  expandedIds: Set<string>;
  setExpandedIds: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onOpen: (event: ChronicleEvent) => void;
  onEdit: (event: ChronicleEvent) => void;
  canEdit: boolean;
  t: (key: DictKey) => string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; center: number } | null>(null);
  const [cluster, setCluster] = useState<(ReturnType<typeof clusterCollapsed>[number] & { side: 'pos' | 'neg' }) | null>(
    null
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const ppd = pxPerDayAt(zoom);
  const viewStart = center - (size.w / 2 / ppd) * DAY_MS;
  const viewEnd = center + (size.w / 2 / ppd) * DAY_MS;
  const timeToX = (ms: number) => ((ms - viewStart) / DAY_MS) * ppd;
  const live = useRef({ zoom, center, size, ppd, viewStart, setZoom, setCenter });
  live.current = { zoom, center, size, ppd, viewStart, setZoom, setCenter };

  function bound(ms: number) {
    return clampCenter(ms, size.w, ppd);
  }

  const prepared: Prepared[] = useMemo(() => {
    return events.map((e) => {
      const span = eventSpan(e);
      return { ...e, anchor: span.center, span };
    });
  }, [events]);

  const inView = prepared.filter(
    (e) => e.span.end >= viewStart - 40 * DAY_MS && e.span.start <= viewEnd + 40 * DAY_MS
  );

  const periods = inView.filter((e) => eventIsPeriodLine(e));

  const posLayout = layoutLane({
    events: inView.filter((e) => e.nature !== 'negative'),
    zoomIndex: zoom,
    timeToX,
    expandedIds,
  });
  const negLayout = layoutLane({
    events: inView.filter((e) => e.nature === 'negative'),
    zoomIndex: zoom,
    timeToX,
    expandedIds,
  });

  const posClusters = clusterCollapsed(posLayout);
  const negClusters = clusterCollapsed(negLayout);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const s = live.current;
      if (e.ctrlKey || e.metaKey) {
        const dir = e.deltaY > 0 ? -0.18 : 0.18;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const atTime = s.viewStart + (x / s.ppd) * DAY_MS;
        const next = Math.min(5, Math.max(0, s.zoom + dir));
        const nextPpd = pxPerDayAt(next);
        const newCenter = atTime - ((x - s.size.w / 2) / nextPpd) * DAY_MS;
        s.setZoom(next);
        s.setCenter(clampCenter(newCenter, s.size.w, nextPpd));
        return;
      }
      const dx = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      s.setCenter((c) => clampCenter(c + (dx / s.ppd) * DAY_MS, s.size.w, s.ppd));
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.event-card, .dot, .period, .cluster-pop, button')) return;
    setGrabbing(true);
    drag.current = { x: e.clientX, center };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    setCenter(clampCenter(drag.current.center - (dx / ppd) * DAY_MS, size.w, ppd));
  }

  function onPointerUp() {
    drag.current = null;
    setGrabbing(false);
  }

  function onDblClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.event-card, .dot, .period')) return;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const atTime = viewStart + (x / ppd) * DAY_MS;
    const next = Math.min(5, zoom + 1);
    setZoom(next);
    setCenter(bound(atTime));
  }

  function toggleExpand(item: LaneItem) {
    setExpandedIds((s) => {
      const n = new Set(s);
      if (n.has(item.event.id)) n.delete(item.event.id);
      else n.add(item.event.id);
      return n;
    });
    setCluster(null);
  }

  function openCluster(cl: ReturnType<typeof clusterCollapsed>[number], side: 'pos' | 'neg', ev: React.MouseEvent) {
    ev.stopPropagation();
    if (cl.items.length === 1) {
      toggleExpand(cl.items[0]);
      return;
    }
    setCluster({ ...cl, side });
  }

  const lineY = size.h / 2;

  const posPeriods: Prepared[] = [];
  const negPeriods: Prepared[] = [];
  for (const e of periods) {
    (e.nature === 'negative' ? negPeriods : posPeriods).push(e);
  }

  function stackPeriods(list: Prepared[]) {
    const lanes: number[] = [];
    return list
      .slice()
      .sort((a, b) => a.span.start - b.span.start)
      .map((e) => {
        let lane = 0;
        while (lanes[lane] != null && lanes[lane] > e.span.start) lane += 1;
        lanes[lane] = e.span.end;
        return { e, lane };
      });
  }

  return (
    <div
      ref={rootRef}
      className={`timeline-root ${grabbing ? 'is-grabbing' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDblClick}
      onClick={() => setCluster(null)}
    >
      {stackPeriods(posPeriods).map(({ e, lane }) => {
        const left = timeToX(e.span.start);
        const width = Math.max(8, timeToX(e.span.end) - timeToX(e.span.start));
        return (
          <button
            key={`p-${e.id}`}
            className="period pos"
            style={{ left, width, top: lineY - 22 - lane * 16 }}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpen(e);
            }}
            title={e.title}
          >
            <span className="period-cap" />
            <span className="period-rail" />
            <span className="period-cap" />
          </button>
        );
      })}
      {stackPeriods(negPeriods).map(({ e, lane }) => {
        const left = timeToX(e.span.start);
        const width = Math.max(8, timeToX(e.span.end) - timeToX(e.span.start));
        return (
          <button
            key={`p-${e.id}`}
            className="period neg"
            style={{ left, width, top: lineY + 12 + lane * 16 }}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpen(e);
            }}
            title={e.title}
          >
            <span className="period-cap" />
            <span className="period-rail" />
            <span className="period-cap" />
          </button>
        );
      })}

      <div className="gold-line" />

      <div className="lane pos">
        {posLayout
          .filter((i) => !i.collapsed)
          .map((item) => (
            <EventCard
              key={item.event.id}
              item={item}
              side="pos"
              onOpen={onOpen}
              onEdit={onEdit}
              canEdit={canEdit}
            />
          ))}
      </div>
      <div className="lane neg">
        {negLayout
          .filter((i) => !i.collapsed)
          .map((item) => (
            <EventCard
              key={item.event.id}
              item={item}
              side="neg"
              onOpen={onOpen}
              onEdit={onEdit}
              canEdit={canEdit}
            />
          ))}
      </div>

      {[...posLayout, ...negLayout]
        .filter((i) => !i.collapsed)
        .map((i) => {
          const expanded = expandedIds.has(i.event.id);
          return (
            <button
              key={`dot-${i.event.id}`}
              className={`dot ${i.event.nature === 'negative' ? 'neg' : ''} ${expanded ? 'is-open' : ''}`}
              style={{ left: i.left + i.width / 2, top: lineY }}
              onClick={(e) => {
                e.stopPropagation();
                if (expanded) toggleExpand(i);
                else onOpen(i.event);
              }}
            />
          );
        })}

      {posClusters.map((cl, idx) => (
        <button
          key={`pc-${idx}`}
          className={`dot collapsed ${cl.items.length > 1 ? 'has-many' : ''}`}
          style={{ left: cl.x, top: lineY }}
          title={cl.items.map((i) => i.event.title).join(', ')}
          onClick={(e) => openCluster(cl, 'pos', e)}
        />
      ))}
      {negClusters.map((cl, idx) => (
        <button
          key={`nc-${idx}`}
          className={`dot collapsed neg ${cl.items.length > 1 ? 'has-many' : ''}`}
          style={{ left: cl.x, top: lineY }}
          title={cl.items.map((i) => i.event.title).join(', ')}
          onClick={(e) => openCluster(cl, 'neg', e)}
        />
      ))}

      {cluster ? (
        <div
          className="cluster-pop"
          style={{
            left: Math.min(cluster.x + 12, size.w - 200),
            top: cluster.side === 'pos' ? lineY - 120 : lineY + 16,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {cluster.items.map((item) => (
            <button key={item.event.id} onClick={() => toggleExpand(item)}>
              {item.event.title}
              <span style={{ opacity: 0.55, marginLeft: 8 }}>
                {t(TIER_KEYS[item.event.tier])}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
