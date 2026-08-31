'use client';

import { Plus, X } from 'lucide-react';
import ColorPicker from '@/components/ColorPicker';
import {
  DEFAULT_GLOW_ALPHA,
  DEFAULT_GLOW_SCALE,
  MAX_GLOW_STOPS,
  parseGlowConfig,
  serializeGlowConfig,
} from '@/lib/timeline/glow';

const NEXT_DEFAULTS = ['#f59e0b', '#ef4444', '#a855f7', '#38bdf8', '#22c55e'];

export default function GlowStopsField({
  value,
  onChange,
  offLabel,
  addLabel,
  hint,
  alphaLabel,
  scaleLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  offLabel: string;
  addLabel: string;
  hint: string;
  alphaLabel: string;
  scaleLabel: string;
}) {
  const cfg = parseGlowConfig(value);
  const stops = cfg?.colors ?? [];
  const off = stops.length === 0;
  const alpha = cfg?.alpha ?? DEFAULT_GLOW_ALPHA;
  const scale = cfg?.scale ?? DEFAULT_GLOW_SCALE;
  const preview = off
    ? 'transparent'
    : stops.length === 1
      ? stops[0]
      : `linear-gradient(90deg, ${stops.join(', ')})`;

  function commit(next: { colors: string[]; alpha: number; scale: number }) {
    onChange(serializeGlowConfig(next) || '');
  }

  return (
    <div className="gdvn-glow-stops">
      <div className="gdvn-glow-preview" style={{ background: preview, opacity: off ? 1 : alpha }} />
      <div className="gdvn-glow-row">
        {stops.map((color, i) => (
          <div key={`${color}-${i}`} className="gdvn-glow-stop">
            <ColorPicker
              value={color}
              onChange={(hex) => {
                const next = stops.slice();
                next[i] = hex;
                commit({ colors: next, alpha, scale });
              }}
            />
            <button
              type="button"
              className="gdvn-glow-x"
              aria-label="Remove color"
              onClick={() => commit({ colors: stops.filter((_, idx) => idx !== i), alpha, scale })}
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
              const pick =
                NEXT_DEFAULTS.find((c) => !stops.includes(c)) ||
                NEXT_DEFAULTS[stops.length % NEXT_DEFAULTS.length];
              commit({ colors: [...stops, pick], alpha, scale });
            }}
          >
            <Plus />
            {addLabel}
          </button>
        ) : null}
      </div>
      {off ? null : (
        <div className="gdvn-glow-sliders">
          <label>
            <span>
              {alphaLabel}
              <em>{Math.round(alpha * 100)}%</em>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={alpha}
              onChange={(e) => commit({ colors: stops, alpha: Number(e.target.value), scale })}
            />
          </label>
          <label>
            <span>
              {scaleLabel}
              <em>{Math.round(scale * 100)}%</em>
            </span>
            <input
              type="range"
              min={0.15}
              max={1.4}
              step={0.01}
              value={scale}
              onChange={(e) => commit({ colors: stops, alpha, scale: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
      <label className="gdvn-glow-off">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? ''
                : serializeGlowConfig({
                    colors: ['#f59e0b'],
                    alpha: DEFAULT_GLOW_ALPHA,
                    scale: DEFAULT_GLOW_SCALE,
                  }) || ''
            )
          }
        />
        {offLabel}
      </label>
      <p className="gdvn-glow-hint">{hint}</p>
    </div>
  );
}
