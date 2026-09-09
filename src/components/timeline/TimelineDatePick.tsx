'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
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

import DatePicker from '@/components/DatePicker';

function msToDateInput(ms: number) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateInputToMs(str: string) {
  if (!str) return TIMELINE_ORIGIN;
  const [y, m, d] = str.split('-');
  return clampDate(Number(y), Number(m), Number(d));
}

export default function TimelineDatePick({
  valueMs,
  chip,
  onPick,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (ms: number) => void;
  valueMs: number;
  chip: string;
  t: (key: DictKey) => string;
}) {
  return (
    <div className="date-jump">
      <DatePicker 
        date={msToDateInput(valueMs)} 
        onApply={(d) => onPick(dateInputToMs(d))} 
        labelFormat={() => chip}
      />
    </div>
  );
}
