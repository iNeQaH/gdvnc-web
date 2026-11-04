'use client';

import React from 'react';
import { Gamepad2 } from 'lucide-react';

export interface GdIconSet {
  cube: number;
  ship: number;
  ball: number;
  ufo: number;
  wave: number;
  robot: number;
  spider: number;
  swing: number;
  jetpack: number;
  deathEffect?: number;
  glow?: boolean;
  color1: number;
  color2: number;
  color3?: number;
}

const FORMS = [
  { key: 'cube', label: 'Cube', form: 'cube' },
  { key: 'ship', label: 'Ship', form: 'ship' },
  { key: 'ball', label: 'Ball', form: 'ball' },
  { key: 'ufo', label: 'UFO', form: 'ufo' },
  { key: 'wave', label: 'Wave', form: 'wave' },
  { key: 'robot', label: 'Robot', form: 'robot' },
  { key: 'spider', label: 'Spider', form: 'spider' },
  { key: 'swing', label: 'Swing', form: 'swing' },
  { key: 'jetpack', label: 'Jetpack', form: 'jetpack' },
] as const;

export default function GdIconSetDisplay({
  iconSet,
  className = '',
}: {
  iconSet?: GdIconSet | null;
  className?: string;
}) {
  if (!iconSet) return null;

  const col1 = iconSet.color1 ?? 0;
  const col2 = iconSet.color2 ?? 0;
  const glow = iconSet.glow ? 1 : 0;
  const colG = iconSet.color3 ?? col2;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${className}`}
      style={{
        backgroundColor: 'var(--bg-subtle)',
        borderColor: 'var(--border-ui)',
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold ui-title tracking-wide block">
              Icon set
            </span>
          </div>
        </div>
        {iconSet.glow && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
            Glow ON
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-9 gap-2.5">
        {FORMS.map(({ key, label, form }) => {
          const iconId = (iconSet as any)[key] ?? 1;
          const iconUrl = `/api/gd/icon?form=${form}&icon=${iconId}&col1=${col1}&col2=${col2}${glow ? `&glow=1&colG=${colG}` : ''}&size=128&v=3`;

          return (
            <div
              key={key}
              className="group relative flex flex-col items-center justify-between p-2 rounded-xl border bg-black/20 dark:bg-black/40 hover:scale-105 transition-transform"
              style={{ borderColor: 'var(--border-subtle)' }}
              title={`${label} #${iconId}`}
            >
              <div className="w-12 h-12 flex items-center justify-center relative my-1">
                <img
                  src={iconUrl}
                  alt={label}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.triedFallback) {
                      target.dataset.triedFallback = 'true';
                      target.src = `/api/gd/icon?form=${form}&icon=1&col1=${col1}&col2=${col2}&size=128&v=3`;
                    }
                  }}
                />
              </div>
              <div className="text-center w-full pt-1 border-t border-white/5">
                <div className="text-[10px] font-black ui-title truncate">{label}</div>
                <div className="text-[9px] font-mono font-bold ui-dim">#{iconId}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
