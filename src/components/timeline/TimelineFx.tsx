'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_W } from '@/lib/timeline/layout';
import { DAY_MS, TIMELINE_ORIGIN } from '@/lib/timeline/time';
import type { ChronicleEvent } from '@/lib/timeline/types';

const GRID = 48;
const GHOST_SLOTS = [
  { u: 0.13, v: 0.16, large: true, parallax: 0.14 },
  { u: 0.48, v: 0.12, large: false, parallax: 0.5 },
  { u: 0.86, v: 0.22, large: true, parallax: 0.18 },
  { u: 0.2, v: 0.5, large: false, parallax: 0.54 },
  { u: 0.7, v: 0.44, large: true, parallax: 0.16 },
  { u: 0.11, v: 0.84, large: false, parallax: 0.56 },
  { u: 0.78, v: 0.8, large: true, parallax: 0.2 },
] as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(value: number, span: number) {
  if (span <= 0) return 0;
  return ((value % span) + span) % span;
}

function GhostMedia({ event }: { event: ChronicleEvent }) {
  const [failed, setFailed] = useState(false);
  if (!event.image || failed) {
    return <div className="card-desc">{event.shortDescription || event.title}</div>;
  }
  return (
    <div className="card-media">
      <img src={event.image} alt="" onError={() => setFailed(true)} />
    </div>
  );
}

const PARTICLE_COUNT = 28;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  blink: number;
  blinkSpeed: number;
  hueShift: number;
};

function mixRgb(a: [number, number, number], b: [number, number, number], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as [number, number, number];
}

function readAccentRgb(el: HTMLElement | null): [number, number, number] {
  if (!el) return [226, 232, 240];
  const raw = getComputedStyle(el).color || 'rgb(226, 232, 240)';
  const m = raw.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);
  if (!m) return [226, 232, 240];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  if (s <= 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = hue / 360;
  const channel = (t: number) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [
    Math.round(channel(hk + 1 / 3) * 255),
    Math.round(channel(hk) * 255),
    Math.round(channel(hk - 1 / 3) * 255),
  ];
}

function shiftHue(rgb: [number, number, number], deg: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToRgb(h + deg, s, l);
}

export default function TimelineFx({
  events,
  viewStart,
  ppd,
  width,
  height,
  lineEndX,
}: {
  events: ChronicleEvent[];
  zoom: number;
  viewStart: number;
  ppd: number;
  width: number;
  height: number;
  lineEndX: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  const originX = ((TIMELINE_ORIGIN - viewStart) / DAY_MS) * ppd;
  const gridShift = originX * 0.08;

  const ghosts = useMemo(() => {
    if (!events.length || width < 8 || height < 8) return [];
    const panDays = (viewStart - TIMELINE_ORIGIN) / DAY_MS;
    const fade = 96;
    const pool = events;
    return GHOST_SLOTS.map((slot, i) => {
      if (!pool.length) return null;
      const rand = mulberry32(0x6d764e31 ^ (i + 1) * 0x9e3779b9);
      const u = slot.u + (rand() - 0.5) * 0.05;
      const v = slot.v + (rand() - 0.5) * 0.05;
      const scale = slot.large ? 0.92 + rand() * 0.28 : 0.42 + rand() * 0.28;
      const w = CARD_W * scale;
      const h = (slot.large ? 150 : 88) * scale;
      const pad = w / 2 + 140;
      const span = Math.max(width + pad * 2, 1);
      const travel = u * width - panDays * ppd * slot.parallax;
      const cycle = Math.floor(travel / span);
      const pick = mulberry32(((i + 7) * 0x85ebca6b) ^ (cycle * 0xc2b2ae35));
      const event = pool[Math.floor(pick() * pool.length)];
      const cx = wrap(travel, span) - pad;
      const left = cx - w / 2;
      const shown = Math.min(left + w, lineEndX) - Math.max(left, 0);
      const edge = shown <= 0 ? 0 : Math.min(1, shown / fade);
      const base = slot.large ? 0.55 : 0.4;
      if (cx > lineEndX + w / 2) return null;
      return {
        key: `ghost-${i}`,
        event,
        large: slot.large,
        x: cx,
        top: v * height,
        w,
        h,
        opacity: edge * base,
      };
    }).filter((g): g is NonNullable<typeof g> => Boolean(g));
  }, [events, viewStart, ppd, height, width, lineEndX]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 8 || height < 8) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const surface = canvas;
    canvas.width = width;
    canvas.height = height;
    let raf = 0;
    let last = performance.now();

    function spawn(scatter: boolean): Particle {
      const band = Math.min(52, height * 0.08);
      const dist = Math.max(80, width + 56);
      const maxSpeed = dist / 2.8;
      const minSpeed = dist / 18;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      return {
        x: scatter ? Math.random() * width : width - 4,
        y: height * 0.5 + (Math.random() - 0.5) * band,
        vx: -speed,
        vy: (Math.random() - 0.5) * 1.4,
        size: 2 + Math.random() * 4,
        life: scatter ? Math.random() * 6 : 0,
        maxLife: 10 + Math.random() * 8,
        blink: Math.random() * Math.PI * 2,
        blinkSpeed: 3.2 + Math.random() * 6.5,
        hueShift: (Math.random() - 0.5) * 16,
      };
    }

    particles.current = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.current.push(spawn(true));

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const theme = readAccentRgb(surface);
      const mid = height * 0.5;
      const half = Math.min(52, height * 0.08) / 2;
      ctx!.clearRect(0, 0, width, height);
      const list = particles.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.blink += p.blinkSpeed * dt;
        if (p.y < mid - half || p.y > mid + half) p.vy *= -1;
        if (p.x < -12 || p.x > width + 8 || p.life >= p.maxLife) {
          list[i] = spawn(false);
          continue;
        }
        const fade = 1 - p.life / p.maxLife;
        const wave = 0.5 + 0.5 * Math.sin(p.blink);
        const flash = 0.22 + 0.78 * wave;
        const tint = shiftHue(theme, p.hueShift);
        const bright = mixRgb(tint, [255, 255, 255], 0.35);
        const white = wave > 0.88;
        const themeFlash = !white && wave > 0.62;
        ctx!.save();
        ctx!.globalAlpha = fade * (0.18 + flash * 0.72);
        if (white) {
          ctx!.shadowColor = 'rgba(255,255,255,0.45)';
          ctx!.shadowBlur = 5;
          ctx!.fillStyle = '#ffffff';
        } else if (themeFlash) {
          ctx!.shadowColor = `rgba(${tint[0]},${tint[1]},${tint[2]},0.4)`;
          ctx!.shadowBlur = 4;
          ctx!.fillStyle = `rgb(${bright[0]},${bright[1]},${bright[2]})`;
        } else {
          ctx!.shadowBlur = 0;
          ctx!.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
        }
        ctx!.fillRect(p.x, p.y, p.size, p.size);
        ctx!.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <div className="timeline-fx" aria-hidden>
      <div
        className="timeline-grid"
        style={{
          backgroundPosition: `${gridShift}px 0`,
          backgroundSize: `${GRID}px ${GRID}px`,
        }}
      />
      <div className="timeline-ghosts">
        {ghosts.map((g) => (
          <article
            key={g.key}
            className={`timeline-ghost ${g.large ? 'is-large' : 'is-small'}`}
            style={{
              left: g.x,
              top: g.top,
              width: g.w,
              height: g.h,
              opacity: g.opacity,
            }}
          >
            <div className="card-title">{g.event.title}</div>
            <div className="card-frame">
              <GhostMedia event={g.event} />
            </div>
          </article>
        ))}
      </div>
      <canvas ref={canvasRef} className="timeline-particles" />
    </div>
  );
}
