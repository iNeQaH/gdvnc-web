'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hexToHsv, hsvToHex, hueCss, parseHex } from '@/lib/color';

const PRESETS = [
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#38bdf8',
  '#22c55e',
  '#f472b6',
  '#ffffff',
  '#0f172a',
];

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export default function ColorPicker({
  value,
  onChange,
  ariaLabel,
  size = 36,
  round = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
  size?: number;
  round?: boolean;
}) {
  const hex = parseHex(value) || '#f59e0b';
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(hex) || [32, 0.95, 0.96]);
  const [hexDraft, setHexDraft] = useState(hex);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const next = hexToHsv(hex);
    if (next) setHsv(next);
    setHexDraft(hex);
  }, [hex]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const w = 252;
    const h = 278;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - 8);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  function commit(next: [number, number, number]) {
    setHsv(next);
    const out = hsvToHex(next[0], next[1], next[2]);
    setHexDraft(out);
    onChange(out);
  }

  function onSvPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const s = clamp((ev.clientX - r.left) / r.width);
      const v = clamp(1 - (ev.clientY - r.top) / r.height);
      commit([hsv[0], s, v]);
    };
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onHuePointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const h = clamp((ev.clientX - r.left) / r.width) * 360;
      commit([h, hsv[1], hsv[2]]);
    };
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const live = hsvToHex(hsv[0], hsv[1], hsv[2]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`gdvn-swatch ${round ? 'is-round' : ''}`}
        style={{ width: size, height: size, background: hex }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      />
      {open
        ? createPortal(
            <div
              ref={popRef}
              className="gdvn-color-pop"
              style={{ top: pos.top, left: pos.left }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                className="gdvn-color-sv"
                style={{ backgroundColor: hueCss(hsv[0]) }}
                onPointerDown={onSvPointer}
              >
                <span
                  className="gdvn-color-knob"
                  style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }}
                />
              </div>
              <div className="gdvn-color-hue" onPointerDown={onHuePointer}>
                <span className="gdvn-color-hue-knob" style={{ left: `${(hsv[0] / 360) * 100}%` }} />
              </div>
              <div className="gdvn-color-meta">
                <span className="gdvn-color-chip" style={{ background: live }} />
                <input
                  value={hexDraft}
                  spellCheck={false}
                  onChange={(e) => {
                    const next = e.target.value;
                    setHexDraft(next);
                    const parsed = parseHex(next);
                    if (parsed) onChange(parsed);
                  }}
                  onBlur={() => setHexDraft(hex)}
                />
              </div>
              <div className="gdvn-color-presets">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`gdvn-swatch is-sm ${hex === c ? 'is-on' : ''}`}
                    style={{ background: c }}
                    onClick={() => onChange(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
