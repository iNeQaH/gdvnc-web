'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import TimelineBoard from '@/components/timeline/TimelineBoard';
import EventPage from '@/components/timeline/EventPage';
import EventForm from '@/components/timeline/EventForm';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import type { ChronicleEvent } from '@/lib/timeline/types';
import type { DictKey } from '@/lib/dictionaries';
import { TIERS } from '@/lib/timeline/tiers';
import { nearestTierIndex, formatDate, clampCenter, pxPerDayAt } from '@/lib/timeline/time';
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
  const [center, setCenter] = useState(() => Date.now());
  const [expandedIds, setExpandedIds] = useState(() => new Set<string>());
  const [open, setOpen] = useState<ChronicleEvent | null>(null);
  const [editing, setEditing] = useState<ChronicleEvent | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
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
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.25));
      if (e.key === '-') setZoom((z) => Math.max(0, z - 0.25));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const tier = TIERS[nearestTierIndex(zoom)];
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
        setOpen(null);
        setFormOpen(false);
      } catch {
        showToast(t('common.network_error'), 'error');
      }
    });
  }

  function jumpToToday() {
    const w = rootRef.current?.clientWidth || window.innerWidth;
    setCenter(clampCenter(Date.now(), w, pxPerDayAt(zoom)));
  }

  const tierLabel = t(`timeline.tier.${tier.id}` as DictKey);

  return (
    <div className="gdvn-timeline" ref={rootRef}>
      <header className="hud">
        <div className="brand">
          <h1>{t('timeline.brand')}</h1>
          <p>{t('timeline.tagline')}</p>
        </div>
        <div className="now-chip">
          {tierLabel} · {viewLabel}
        </div>
        <div className="actions">
          <button
            type="button"
            className="icon-btn"
            onClick={jumpToToday}
            aria-label={t('timeline.jump_today')}
            title={t('timeline.jump_today')}
          >
            <RotateCcw className="w-4 h-4" />
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
        setZoom={setZoom}
        center={center}
        setCenter={setCenter}
        expandedIds={expandedIds}
        setExpandedIds={setExpandedIds}
        onOpen={setOpen}
        onEdit={(e) => {
          if (!canEdit) return;
          setEditing(e);
          setFormOpen(true);
        }}
        canEdit={canEdit}
        t={t}
      />

      {loaded && events.length === 0 ? (
        <div className="empty-hint">
          {t('timeline.empty')}
          {canEdit ? ` ${t('timeline.empty_staff')}` : ''}
        </div>
      ) : null}

      <div className="zoom-dock">
        <button type="button" onClick={() => setZoom((z) => Math.max(0, z - 0.35))} aria-label={t('timeline.zoom_out')}>
          −
        </button>
        <input
          className="zoom-track"
          type="range"
          min="0"
          max="5"
          step="0.01"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <button type="button" onClick={() => setZoom((z) => Math.min(5, z + 0.35))} aria-label={t('timeline.zoom_in')}>
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
