'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMELINE_ORIGIN } from '@/lib/timeline/time';
import type { DictKey } from '@/lib/dictionaries';

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function startOfDay(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function mondayIndex(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

export default function TimelineDatePick({
  open,
  onToggle,
  onClose,
  onPick,
  valueMs,
  chip,
  language,
  t,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (ms: number) => void;
  valueMs: number;
  chip: string;
  language: 'en' | 'vi';
  t: (key: DictKey) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = startOfDay(valueMs);
  const sel = new Date(selected);
  const [cursor, setCursor] = useState({ y: sel.getFullYear(), m: sel.getMonth() });

  useEffect(() => {
    if (!open) return;
    const d = new Date(startOfDay(valueMs));
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }, [open, valueMs]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  const origin = new Date(TIMELINE_ORIGIN);
  const minY = origin.getFullYear();
  const minM = origin.getMonth();
  const weekdays = language === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN;
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long' }),
    [language]
  );

  const cells = useMemo(() => {
    const lead = mondayIndex(cursor.y, cursor.m);
    const count = daysInMonth(cursor.y, cursor.m);
    const out: Array<{ day: number; ms: number; disabled: boolean } | null> = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let day = 1; day <= count; day++) {
      const ms = new Date(cursor.y, cursor.m, day).getTime();
      out.push({ day, ms, disabled: ms < TIMELINE_ORIGIN });
    }
    return out;
  }, [cursor.y, cursor.m]);

  const canPrev = cursor.y > minY || (cursor.y === minY && cursor.m > minM);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      if (d.getFullYear() < minY || (d.getFullYear() === minY && d.getMonth() < minM)) {
        return { y: minY, m: minM };
      }
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className={`date-jump ${open ? 'is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="now-chip"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('timeline.goto_date')}
      >
        {chip}
      </button>
      <div className="date-jump-pop" role="dialog" aria-label={t('timeline.goto_date')}>
        <div className="date-jump-nav">
          <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label={t('timeline.prev_month')}>
            ‹
          </button>
          <div className="date-jump-label">
            {monthFmt.format(new Date(cursor.y, cursor.m, 1))} {cursor.y}
          </div>
          <button type="button" onClick={() => shiftMonth(1)} aria-label={t('timeline.next_month')}>
            ›
          </button>
        </div>
        <div className="date-jump-week">
          {weekdays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="date-jump-grid">
          {cells.map((cell, i) =>
            cell ? (
              <button
                key={cell.ms}
                type="button"
                className={`date-jump-day ${cell.ms === selected ? 'is-on' : ''}`}
                disabled={cell.disabled}
                onClick={() => onPick(cell.ms)}
              >
                {cell.day}
              </button>
            ) : (
              <span key={`e-${i}`} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
