'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DAY_MS,
  pxPerDayAt,
  eventIsPeriodLine,
  eventSpan,
  clampCenter,
  clampZoom,
  timelineEnd,
  stepZoom,
  TIMELINE_ARROW_GUTTER_PX,
  TIMELINE_NOW_INSET_PX,
  neighborEvent,
} from '@/lib/timeline/time';
import { clusterCollapsed, layoutLane, type LaneItem } from '@/lib/timeline/layout';
import EventCard from '@/components/timeline/EventCard';
import TimelineFx from '@/components/timeline/TimelineFx';
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
  onFocusEvent,
  onStepEvent,
  onEdit,
  canEdit,
  ldm,
  t,
  onZoomLive,
  onZoomEnd,
  onUserGesture,
}: {
  events: ChronicleEvent[];
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  center: number;
  setCenter: (c: number | ((prev: number) => number)) => void;
  expandedIds: Set<string>;
  setExpandedIds: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onOpen: (event: ChronicleEvent) => void;
  onFocusEvent: (id: string) => void;
  onStepEvent: (dir: -1 | 1) => void;
  onEdit: (event: ChronicleEvent) => void;
  canEdit: boolean;
  ldm: boolean;
  t: (key: DictKey) => string;
  onZoomLive: (zoom: number, anchorX: number) => void;
  onZoomEnd: () => void;
  onUserGesture: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{
    pointerId: number;
    x: number;
    center: number;
    lastX: number;
    lastT: number;
    vx: number;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const glide = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (glide.current != null) cancelAnimationFrame(glide.current);
    };
  }, []);

  const ppd = pxPerDayAt(zoom);
  const viewStart = center - (size.w / 2 / ppd) * DAY_MS;
  const viewEnd = center + (size.w / 2 / ppd) * DAY_MS;
  const timeToX = (ms: number) => ((ms - viewStart) / DAY_MS) * ppd;
  const live = useRef({
    zoom,
    center,
    size,
    ppd,
    viewStart,
    setZoom,
    setCenter,
    onUserGesture,
  });
  live.current = { zoom, center, size, ppd, viewStart, setZoom, setCenter, onUserGesture };

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
      stopGlide();
      const s = live.current;
      s.onUserGesture();
      if (e.ctrlKey || e.metaKey) {
        s.setZoom(stepZoom(s.zoom, e.deltaY > 0 ? -1 : 1));
        return;
      }
      const dx = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      s.setCenter((c) => clampCenter(c + (dx / s.ppd) * DAY_MS, s.size.w, s.ppd));
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  function stopGlide() {
    if (glide.current != null) {
      cancelAnimationFrame(glide.current);
      glide.current = null;
    }
  }

  function pinchDist() {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function pinchAnchorX() {
    const el = rootRef.current;
    const pts = [...pointers.current.values()];
    if (!el || pts.length < 2) return live.current.size.w / 2;
    const rect = el.getBoundingClientRect();
    return (pts[0].x + pts[1].x) / 2 - rect.left;
  }

  function beginPinch() {
    const dist = pinchDist();
    if (dist < 8) return;
    drag.current = null;
    setGrabbing(false);
    pinch.current = { dist, zoom: live.current.zoom };
  }

  function applyPinch() {
    const start = pinch.current;
    const dist = pinchDist();
    if (!start || dist < 8) return;
    const next = clampZoom(start.zoom + Math.log2(dist / start.dist) * 1.4);
    onZoomLive(next, pinchAnchorX());
  }

  function startGlide(vxPxPerMs: number) {
    stopGlide();
    if (Math.abs(vxPxPerMs) < 0.08) return;
    let vx = vxPxPerMs;
    let last = performance.now();
    const friction = 0.0045;
    const step = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      vx *= Math.exp(-friction * dt);
      const s = live.current;
      if (Math.abs(vx) < 0.02) {
        glide.current = null;
        return;
      }
      s.setCenter((c) => clampCenter(c - (vx * dt / s.ppd) * DAY_MS, s.size.w, s.ppd));
      glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    onUserGesture();
    stopGlide();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }

    if ((e.target as HTMLElement).closest('.event-card, .dot, .period, .cluster-pop, button, .lane-nav')) return;
    if (e.pointerType === 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setGrabbing(true);
    const now = performance.now();
    drag.current = { pointerId: e.pointerId, x: e.clientX, center, lastX: e.clientX, lastT: now, vx: 0 };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) && !drag.current) return;
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinch.current && pointers.current.size >= 2) {
      applyPinch();
      return;
    }

    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const now = performance.now();
    const dt = now - drag.current.lastT;
    if (dt > 0) {
      const inst = (e.clientX - drag.current.lastX) / dt;
      drag.current.vx = drag.current.vx * 0.65 + inst * 0.35;
      drag.current.lastX = e.clientX;
      drag.current.lastT = now;
    }
    const dx = e.clientX - drag.current.x;
    setCenter(clampCenter(drag.current.center - (dx / ppd) * DAY_MS, size.w, ppd));
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);

    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current = null;
        onZoomEnd();
      }
      drag.current = null;
      setGrabbing(false);
      return;
    }

    if (drag.current && drag.current.pointerId === e.pointerId) {
      let vx = drag.current.vx;
      const idle = performance.now() - drag.current.lastT;
      if (idle > 16) vx *= Math.exp(-0.0045 * idle);
      drag.current = null;
      setGrabbing(false);
      startGlide(vx);
    }
  }

  function onDblClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.event-card, .dot, .period')) return;
    setZoom(Math.min(5, Math.round(zoom) + 1));
  }

  function toggleExpand(item: LaneItem) {
    onFocusEvent(item.event.id);
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
  const nowX = timeToX(timelineEnd());
  const lineEndX = Math.min(
    size.w - TIMELINE_ARROW_GUTTER_PX,
    Math.max(0, nowX + TIMELINE_NOW_INSET_PX)
  );
  const zoomRank = Math.round(zoom);
  const prevEvent = neighborEvent(events, center, zoomRank, -1);
  const nextEvent = neighborEvent(events, center, zoomRank, 1);

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
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={onDblClick}
      onClick={() => setCluster(null)}
    >
      {ldm ? null : (
        <TimelineFx
          events={events}
          viewStart={viewStart}
          ppd={ppd}
          width={size.w}
          height={size.h}
        />
      )}
      <div className="timeline-clip" style={{ width: lineEndX }}>
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

      {[...posLayout, ...negLayout]
        .filter((i) => !i.collapsed)
        .map((i) => {
          const x = i.left + i.width / 2;
          const neg = i.event.nature === 'negative';
          return (
            <div
              key={`stem-${i.event.id}`}
              className={`stem ${neg ? 'neg' : 'pos'}`}
              style={{ left: x }}
            />
          );
        })}

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
              onClick={(ev) => {
                ev.stopPropagation();
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
      <div className="line-arrow" style={{ left: lineEndX, top: lineY }} />
      <button
        type="button"
        className="lane-nav is-left"
        style={{ top: lineY }}
        disabled={!prevEvent}
        aria-label={t('timeline.prev_event')}
        title={t('timeline.prev_event')}
        onClick={(e) => {
          e.stopPropagation();
          onStepEvent(-1);
        }}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        className="lane-nav is-right"
        style={{ top: lineY }}
        disabled={!nextEvent}
        aria-label={t('timeline.next_event')}
        title={t('timeline.next_event')}
        onClick={(e) => {
          e.stopPropagation();
          onStepEvent(1);
        }}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
