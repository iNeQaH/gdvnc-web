'use client';

import { useEffect, useMemo, useRef } from 'react';
import { DAY_MS, TIMELINE_ORIGIN } from '@/lib/timeline/time';
import { CARD_W } from '@/lib/timeline/layout';

const GRID = 48;
const LOOP_MS = 11 * 365.25 * DAY_MS;

type Ghost = {
  id: number;
  t: number;
  y: number;
  scale: number;
  parallax: number;
  w: number;
  h: number;
  large: boolean;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGhosts(): Ghost[] {
  const rand = mulberry32(0x6d764e31);
  const start = TIMELINE_ORIGIN;
  const end = Date.now() + 8 * 365.25 * DAY_MS;
  const span = end - start;
  const out: Ghost[] = [];
  for (let i = 0; i < 36; i++) {
    const large = rand() > 0.55;
    const scale = large ? 1 + rand() * 0.2 : 0.38 + rand() * 0.32;
    out.push({
      id: i,
      t: start + rand() * span,
      y: 0.08 + rand() * 0.84,
      scale,
      parallax: large ? 0.16 : 0.55,
      w: CARD_W * scale,
      h: (large ? 148 : 86) * scale,
      large,
    });
  }
  return out;
}

const GHOSTS = makeGhosts();

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

export default function TimelineFx({
  viewStart,
  ppd,
  width,
  height,
}: {
  viewStart: number;
  ppd: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  const originX = ((TIMELINE_ORIGIN - viewStart) / DAY_MS) * ppd;
  const gridShift = originX * 0.08;

  const ghosts = useMemo(() => {
    const pad = 280;
    const placed: Array<Ghost & { key: string; x: number; top: number }> = [];
    for (const g of GHOSTS) {
      const phase = ((g.t - TIMELINE_ORIGIN) % LOOP_MS + LOOP_MS) % LOOP_MS;
      const k0 = Math.floor((viewStart - LOOP_MS * 2 - TIMELINE_ORIGIN) / LOOP_MS);
      for (let n = 0; n < 8; n++) {
        const t = TIMELINE_ORIGIN + phase + (k0 + n) * LOOP_MS;
        const x = ((t - viewStart) / DAY_MS) * ppd * g.parallax;
        if (x < -g.w - pad || x > width + pad) continue;
        placed.push({ ...g, key: `${g.id}-${k0 + n}`, x, top: g.y * height });
      }
    }
    return placed;
  }, [viewStart, ppd, height, width]);

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
      const x = scatter ? Math.random() * width : width * (0.78 + Math.random() * 0.28);
      const y = scatter ? Math.random() * height * 0.55 : -12 - Math.random() * 40;
      const tx = -12;
      const ty = height + 12;
      const dist = Math.max(80, Math.hypot(tx - x, ty - y));
      const maxSpeed = dist / 2.4;
      const minSpeed = dist / 16;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      return {
        x,
        y,
        vx: ((tx - x) / dist) * speed,
        vy: ((ty - y) / dist) * speed,
        size: 2 + Math.random() * 4,
        life: scatter ? Math.random() * 6 : 0,
        maxLife: 10 + Math.random() * 8,
        blink: Math.random() * Math.PI * 2,
        blinkSpeed: 3.2 + Math.random() * 6.5,
      };
    }

    if (particles.current.length === 0) {
      for (let i = 0; i < 52; i++) particles.current.push(spawn(true));
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const theme = readAccentRgb(surface);
      const bright = mixRgb(theme, [255, 255, 255], 0.35);
      ctx!.clearRect(0, 0, width, height);
      const list = particles.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.blink += p.blinkSpeed * dt;
        if (p.life >= p.maxLife || p.x < -24 || p.y > height + 24) {
          list[i] = spawn(false);
          continue;
        }
        const fade = 1 - p.life / p.maxLife;
        const wave = 0.5 + 0.5 * Math.sin(p.blink);
        const flash = 0.22 + 0.78 * wave;
        const white = wave > 0.88;
        const themeFlash = !white && wave > 0.62;
        ctx!.save();
        ctx!.globalAlpha = fade * (0.18 + flash * 0.72);
        if (white) {
          ctx!.shadowColor = 'rgba(255,255,255,0.45)';
          ctx!.shadowBlur = 5;
          ctx!.fillStyle = '#ffffff';
        } else if (themeFlash) {
          ctx!.shadowColor = `rgba(${theme[0]},${theme[1]},${theme[2]},0.4)`;
          ctx!.shadowBlur = 4;
          ctx!.fillStyle = `rgb(${bright[0]},${bright[1]},${bright[2]})`;
        } else {
          ctx!.shadowBlur = 0;
          ctx!.fillStyle = `rgb(${theme[0]},${theme[1]},${theme[2]})`;
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
          <div
            key={g.key}
            className={`timeline-ghost ${g.large ? 'is-large' : 'is-small'}`}
            style={{
              left: g.x,
              top: g.top,
              width: g.w,
              height: g.h,
            }}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className="timeline-particles" />
    </div>
  );
}
