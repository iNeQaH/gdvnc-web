'use client';

import React, { useRef, useState, useCallback } from 'react';

export interface CircularAnglePickerProps {
  value: number; // 0 to 360
  onChange: (angle: number) => void;
  size?: number; // diameter in px (e.g. 56)
  label?: string;
  accentColor?: string;
  showPresets?: boolean;
  className?: string;
}

export function CircularAnglePicker({
  value = 90,
  onChange,
  size = 56,
  label,
  accentColor = 'var(--accent, #38bdf8)',
  showPresets = true,
  className = '',
}: CircularAnglePickerProps) {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const normalizedAngle = ((Math.round(value) % 360) + 360) % 360;

  const updateAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      // Standard math angle to CSS gradient angle (0deg = Top/North, clockwise)
      const rad = Math.atan2(dy, dx);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;
      deg = deg % 360;

      onChange(deg);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateAngleFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    updateAngleFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already lost
      }
    }
  };

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;
  const needleLen = radius - 4;

  // Convert CSS angle to standard Cartesian coordinates
  const rad = ((normalizedAngle - 90) * Math.PI) / 180;
  const tipX = cx + needleLen * Math.cos(rad);
  const tipY = cy + needleLen * Math.sin(rad);

  // Compass tick markers: 0° (Top), 90° (Right), 180° (Bottom), 270° (Left)
  const ticks = [
    { deg: 0, x1: cx, y1: 4, x2: cx, y2: 7 },
    { deg: 90, x1: size - 4, y1: cy, x2: size - 7, y2: cy },
    { deg: 180, x1: cx, y1: size - 4, x2: cx, y2: size - 7 },
    { deg: 270, x1: 4, y1: cy, x2: 7, y2: cy },
  ];

  const presets = [0, 45, 90, 135, 180, 270];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Circular Clock Dial */}
      <div className="relative group flex items-center justify-center shrink-0">
        <svg
          ref={dialRef}
          width={size}
          height={size}
          className="cursor-crosshair touch-none transition-transform active:scale-95 drop-shadow-md"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label={label || 'Góc quay gradient'}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={normalizedAngle}
        >
          {/* Outer dial disc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            className="fill-slate-900/90 stroke-slate-700/60 dark:stroke-white/20 transition-colors group-hover:stroke-slate-500/80"
            strokeWidth="1.5"
          />

          {/* Compass cardinal ticks */}
          {ticks.map((t) => (
            <line
              key={t.deg}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              className="text-slate-500 dark:text-slate-400"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}

          {/* Needle shadow */}
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Indicator hand / needle */}
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Glowing arrow tip */}
          <circle
            cx={tipX}
            cy={tipY}
            r={3.5}
            fill={accentColor}
            className="drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
          />

          {/* Center pivot point */}
          <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
        </svg>

        {/* Subtle hover ring */}
        <div
          className="absolute inset-0 rounded-full border border-sky-400/0 group-hover:border-sky-400/30 transition-colors pointer-events-none"
          style={{ width: size, height: size }}
        />
      </div>

      {/* Angle display & quick snap buttons */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {label && <span className="text-[11px] ui-dim font-bold">{label}:</span>}
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg border bg-black/40 text-white shadow-xs" style={{ borderColor: 'var(--border-subtle)' }}>
            {normalizedAngle}°
          </span>
        </div>

        {showPresets && (
          <div className="flex items-center gap-1 flex-wrap">
            {presets.map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => onChange(deg)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  normalizedAngle === deg
                    ? 'font-bold shadow-xs text-white'
                    : 'ui-subtle ui-dim hover:text-white'
                }`}
                style={normalizedAngle === deg ? { backgroundColor: accentColor } : undefined}
              >
                {deg}°
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
