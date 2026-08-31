'use client';

import { Plus, X } from 'lucide-react';
import ColorPicker from '@/components/ColorPicker';
import { MAX_GLOW_STOPS, parseGlowColors, serializeGlowColors } from '@/lib/timeline/glow';

const NEXT_DEFAULTS = ['#f59e0b', '#ef4444', '#a855f7', '#38bdf8', '#22c55e'];

export default function GlowStopsField({
  value,
  onChange,
  offLabel,
  addLabel,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  offLabel: string;
  addLabel: string;
  hint: string;
}) {
  const stops = parseGlowColors(value);
  const off = stops.length === 0;
  const preview = off
    ? 'transparent'
    : stops.length === 1
      ? stops[0]
      : `linear-gradient(90deg, ${stops.join(', ')})`;

  function setStops(next: string[]) {
    onChange(serializeGlowColors(next) || '');
  }

  return (
    <div className="gdvn-glow-stops">
      <div className="gdvn-glow-preview" style={{ background: preview }} />
      <div className="gdvn-glow-row">
        {stops.map((color, i) => (
          <div key={`${color}-${i}`} className="gdvn-glow-stop">
            <ColorPicker
              value={color}
              onChange={(hex) => {
                const next = stops.slice();
                next[i] = hex;
                setStops(next);
              }}
            />
            <button
              type="button"
              className="gdvn-glow-x"
              aria-label="Remove color"
              onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
            >
              <X />
            </button>
          </div>
        ))}
        {stops.length < MAX_GLOW_STOPS ? (
          <button
            type="button"
            className="gdvn-glow-add"
            onClick={() => {
              const pick = NEXT_DEFAULTS.find((c) => !stops.includes(c)) || NEXT_DEFAULTS[stops.length % NEXT_DEFAULTS.length];
              setStops([...stops, pick]);
            }}
          >
            <Plus />
            {addLabel}
          </button>
        ) : null}
      </div>
      <label className="gdvn-glow-off">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => onChange(e.target.checked ? '' : '#f59e0b')}
        />
        {offLabel}
      </label>
      <p className="gdvn-glow-hint">{hint}</p>
    </div>
  );
}
