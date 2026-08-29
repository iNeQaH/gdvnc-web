'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import TimelineBoard from '@/components/timeline/TimelineBoard';
import EventPage from '@/components/timeline/EventPage';
import EventForm from '@/components/timeline/EventForm';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import TimelineDatePick from '@/components/timeline/TimelineDatePick';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { DictKey } from '@/lib/dictionaries';
import { TIERS } from '@/lib/timeline/tiers';
import {
  nearestTierIndex,
  formatDate,
  clampCenter,
  pxPerDayAt,
  stepZoom,
  nearestEventAnchor,
  neighborEvent,
  eventSpan,
  TIMELINE_ORIGIN,
} from '@/lib/timeline/time';
import '@/app/timeline/timeline.css';

function isFullAdmin(role?: string | null) {
  return role === 'ADMIN';
}

export default function TimelineApp() {
  const { t } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const [events, setEvents] = useState<ChronicleEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(TIMELINE_ORIGIN);
  const [expandedIds, setExpandedIds] = useState(() => new Set<string>());
  const [open, setOpen] = useState<ChronicleEvent | null>(null);
  const [editing, setEditing] = useState<ChronicleEvent | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ldm, setLdm] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const zoomHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panAnim = useRef<number | null>(null);
  const zoomAnim = useRef<number | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const centerRef = useRef(center);
  centerRef.current = center;
  const [zoomTip, setZoomTip] = useState<{ index: number } | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusIdRef = useRef<string | null>(null);
  focusIdRef.current = focusId;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    setCenter(Date.now());
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (zoomHideRef.current) clearTimeout(zoomHideRef.current);
      if (panAnim.current != null) cancelAnimationFrame(panAnim.current);
      if (zoomAnim.current != null) cancelAnimationFrame(zoomAnim.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gdvnc_user');
      if (raw) {
        const user = JSON.parse(raw);
        setCanEdit(isFullAdmin(user?.role));
      }
    } catch {
      setCanEdit(false);
    }
    try {
      setLdm(localStorage.getItem('gdvnc_timeline_ldm') === '1');
    } catch {
      setLdm(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/timeline')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(null);
        setFormOpen(false);
        setDateOpen(false);
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const ppd = pxPerDayAt(zoom);
      const day = 86_400_000;
      if (e.key === 'ArrowLeft') {
        setCenter((c) => clampCenter(c - (90 / ppd) * day, window.innerWidth, ppd));
      }
      if (e.key === 'ArrowRight') {
        setCenter((c) => clampCenter(c + (90 / ppd) * day, window.innerWidth, ppd));
      }
      if (e.key === '+' || e.key === '=') applyZoom(stepZoom(zoom, 1));
      if (e.key === '-') applyZoom(stepZoom(zoom, -1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const viewLabel = useMemo(() => formatDate(center), [center]);

  async function saveEvent(next: ChronicleEvent) {
    if (saving) return;
    setSaving(true);
    try {
      const isNew = !next.id;
      const res = await fetch(isNew ? '/api/timeline' : `/api/timeline/${next.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('common.server_error'), 'error');
        return;
      }
      const saved: ChronicleEvent = data.event;
      setEvents((list) => {
        const idx = list.findIndex((e) => e.id === saved.id);
        if (idx >= 0) {
          const copy = list.slice();
          copy[idx] = saved;
          return copy;
        }
        return [...list, saved];
      });
      setFormOpen(false);
      setEditing(undefined);
      setOpen(saved);
      setCenter(clampCenter(saved.start, window.innerWidth, pxPerDayAt(zoom)));
    } catch {
      showToast(t('common.network_error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function deleteEvent(event: ChronicleEvent) {
    showConfirm(t('timeline.delete_confirm'), async () => {
      try {
        const res = await fetch(`/api/timeline/${event.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('common.server_error'), 'error');
          return;
        }
        setEvents((list) => list.filter((e) => e.id !== event.id));
        setFocusId((id) => (id === event.id ? null : id));
        setOpen(null);
        setFormOpen(false);
      } catch {
        showToast(t('common.network_error'), 'error');
      }
    });
  }

  function panTo(ms: number) {
    const w = rootRef.current?.clientWidth || window.innerWidth;
    const target = clampCenter(ms, w, pxPerDayAt(zoom));
    if (panAnim.current != null) cancelAnimationFrame(panAnim.current);
    const from = centerRef.current;
    const t0 = performance.now();
    const dur = 560;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - u) ** 3;
      setCenter(from + (target - from) * ease);
      if (u < 1) panAnim.current = requestAnimationFrame(step);
      else panAnim.current = null;
    };
    panAnim.current = requestAnimationFrame(step);
  }

  function jumpToToday() {
    panTo(Date.now());
  }

  function jumpToDate(ms: number) {
    setDateOpen(false);
    panTo(ms);
  }

  function toggleLdm() {
    setLdm((on) => {
      const next = !on;
      try {
        localStorage.setItem('gdvnc_timeline_ldm', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function applyZoom(next: number) {
    const index = nearestTierIndex(next);
    const w = rootRef.current?.clientWidth || window.innerWidth;
    const fromZ = zoomRef.current;
    const fromC = centerRef.current;
    const toC = clampCenter(
      nearestEventAnchor(eventsRef.current, fromC, index, focusIdRef.current),
      w,
      pxPerDayAt(index)
    );
    if (zoomAnim.current != null) cancelAnimationFrame(zoomAnim.current);
    setZoomTip({ index });
    if (zoomHideRef.current) clearTimeout(zoomHideRef.current);
    zoomHideRef.current = setTimeout(() => setZoomTip(null), 1000);
    if (Math.abs(fromZ - index) < 0.02) {
      setZoom(index);
      setCenter(toC);
      return;
    }
    const t0 = performance.now();
    const dur = 420;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - u) ** 3;
      setZoom(fromZ + (index - fromZ) * ease);
      setCenter(fromC + (toC - fromC) * ease);
      if (u < 1) zoomAnim.current = requestAnimationFrame(step);
      else {
        zoomAnim.current = null;
        setZoom(index);
        setCenter(toC);
      }
    };
    zoomAnim.current = requestAnimationFrame(step);
  }

  function jumpToNeighbor(dir: -1 | 1) {
    const rank = nearestTierIndex(zoom);
    const next = neighborEvent(eventsRef.current, centerRef.current, rank, dir);
    if (!next) return;
    setFocusId(next.id);
    panTo(eventSpan(next).center);
  }

  const zoomTipPct = zoomTip ? zoomTip.index / (TIERS.length - 1) : 0;

  return (
    <div className="gdvn-timeline" ref={rootRef}>
      <header className="hud">
        <div className="brand">
          <h1>{t('timeline.brand')}</h1>
          <p>{t('timeline.tagline')}</p>
        </div>
        <TimelineDatePick
          open={dateOpen}
          onToggle={() => setDateOpen((v) => !v)}
          onClose={() => setDateOpen(false)}
          onPick={jumpToDate}
          valueMs={center}
          chip={viewLabel}
          t={t}
        />
        <div className="actions">
          <button
            type="button"
            className={`ldm-btn ${ldm ? 'is-on' : ''}`}
            onClick={toggleLdm}
            aria-pressed={ldm}
            aria-label={t('timeline.ldm_hint')}
            title={t('timeline.ldm_hint')}
          >
            {t('timeline.ldm')}
          </button>
          {canEdit ? (
            <button
              className="gold-btn"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {t('timeline.add')}
            </button>
          ) : null}
        </div>
      </header>

      <TimelineBoard
        events={events}
        zoom={zoom}
        setZoom={(z) => applyZoom(typeof z === 'function' ? z(zoom) : z)}
        center={center}
        setCenter={setCenter}
        expandedIds={expandedIds}
        setExpandedIds={setExpandedIds}
        onOpen={(e) => {
          setFocusId(e.id);
          setOpen(e);
        }}
        onFocusEvent={(id) => setFocusId(id)}
        onStepEvent={jumpToNeighbor}
        onEdit={(e) => {
          if (!canEdit) return;
          setEditing(e);
          setFormOpen(true);
        }}
        canEdit={canEdit}
        ldm={ldm}
        t={t}
      />

      {loaded && events.length === 0 ? (
        <div className="empty-hint">
          {t('timeline.empty')}
          {canEdit ? ` ${t('timeline.empty_staff')}` : ''}
        </div>
      ) : null}

      <button
        type="button"
        className="jump-today-dock"
        onClick={jumpToToday}
        aria-label={t('timeline.jump_today')}
        title={t('timeline.jump_today')}
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="zoom-dock">
        <button type="button" onClick={() => applyZoom(stepZoom(zoom, -1))} aria-label={t('timeline.zoom_out')}>
          −
        </button>
        <div className="zoom-track-wrap">
          <div className="zoom-snaps" aria-hidden>
            {TIERS.map((item, i) => (
              <span
                key={item.id}
                className="zoom-snap"
                style={{ left: `${(i / (TIERS.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          {zoomTip ? (
            <div
              className="zoom-tip"
              style={{
                left: `calc(var(--zoom-thumb) / 2 + ${zoomTipPct} * (100% - var(--zoom-thumb)))`,
              }}
            >
              {t(`timeline.tier.${TIERS[zoomTip.index].id}` as DictKey)}
            </div>
          ) : null}
          <input
            className="zoom-track"
            type="range"
            min="0"
            max={TIERS.length - 1}
            step="1"
            value={nearestTierIndex(zoom)}
            onInput={(e) => applyZoom(Number((e.target as HTMLInputElement).value))}
            aria-label={t('timeline.zoom_in')}
          />
        </div>
        <button type="button" onClick={() => applyZoom(stepZoom(zoom, 1))} aria-label={t('timeline.zoom_in')}>
          +
        </button>
      </div>

      {open ? (
        <EventPage
          event={open}
          onClose={() => setOpen(null)}
          onEdit={(e) => {
            setEditing(e);
            setFormOpen(true);
          }}
          onDelete={deleteEvent}
          canEdit={canEdit}
          t={t}
        />
      ) : null}

      {formOpen && canEdit ? (
        <EventForm
          event={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(undefined);
          }}
          onSave={saveEvent}
          t={t}
        />
      ) : null}
    </div>
  );
}
