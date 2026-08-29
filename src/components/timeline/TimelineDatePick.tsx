'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TIMELINE_ORIGIN } from '@/lib/timeline/time';
import type { DictKey } from '@/lib/dictionaries';

function startOfDay(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clampDate(y: number, m: number, d: number) {
  const year = Math.max(new Date(TIMELINE_ORIGIN).getFullYear(), y);
  const month = Math.min(12, Math.max(1, m));
  const dim = daysInMonth(year, month - 1);
  const day = Math.min(dim, Math.max(1, d));
  const ms = new Date(year, month - 1, day).getTime();
  return ms < TIMELINE_ORIGIN ? TIMELINE_ORIGIN : ms;
}

function digits(value: string, maxLen: number) {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

export default function TimelineDatePick({
  open,
  onToggle,
  onClose,
  onPick,
  valueMs,
  chip,
  t,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (ms: number) => void;
  valueMs: number;
  chip: string;
  t: (key: DictKey) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const selected = new Date(startOfDay(valueMs));
  const [day, setDay] = useState(String(selected.getDate()).padStart(2, '0'));
  const [month, setMonth] = useState(String(selected.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(selected.getFullYear()));

  useEffect(() => {
    if (!open) return;
    const d = new Date(startOfDay(valueMs));
    setDay(String(d.getDate()).padStart(2, '0'));
    setMonth(String(d.getMonth() + 1).padStart(2, '0'));
    setYear(String(d.getFullYear()));
    requestAnimationFrame(() => dayRef.current?.focus());
  }, [open, valueMs]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  function go(e?: FormEvent) {
    e?.preventDefault();
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!d || !m || !y || String(y).length < 4) return;
    onPick(clampDate(y, m, d));
  }

  return (
    <div className={`date-jump ${open ? 'is-open' : ''}`} ref={wrapRef}>
      {open ? (
        <form className="now-chip now-chip-edit" onSubmit={go}>
          <input
            ref={dayRef}
            className="date-jump-num"
            inputMode="numeric"
            maxLength={2}
            aria-label={t('timeline.day')}
            value={day}
            onChange={(e) => setDay(digits(e.target.value, 2))}
          />
          <span>/</span>
          <input
            className="date-jump-num"
            inputMode="numeric"
            maxLength={2}
            aria-label={t('timeline.month')}
            value={month}
            onChange={(e) => setMonth(digits(e.target.value, 2))}
          />
          <span>/</span>
          <input
            className="date-jump-num is-year"
            inputMode="numeric"
            maxLength={4}
            aria-label={t('timeline.year')}
            value={year}
            onChange={(e) => setYear(digits(e.target.value, 4))}
          />
          <button type="submit" className="date-jump-go">
            {t('timeline.goto_date')}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="now-chip"
          onClick={onToggle}
          aria-expanded={false}
          title={t('timeline.goto_date')}
        >
          {chip}
        </button>
      )}
    </div>
  );
}
