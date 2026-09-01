import { DAY_MS, type ChronicleEvent, type TimelineTierId } from '@/lib/timeline/types';
import { TIERS } from '@/lib/timeline/tiers';

/** Timeline starts at 2013-01-01 00:00 (Geometry Dash release year) and ends now. */
export const TIMELINE_ORIGIN = new Date(2013, 0, 1).getTime();

export function timelineEnd() {
  return Date.now();
}

/** Space for the right-end arrow, outside the event clip. */
export const TIMELINE_ARROW_GUTTER_PX = 44;
/** Keep "now" events left of the arrow (≈ half card + gap). */
export const TIMELINE_NOW_INSET_PX = 108;

export function timelineRightPadPx() {
  return TIMELINE_ARROW_GUTTER_PX + TIMELINE_NOW_INSET_PX;
}

export function clampCenter(ms: number, viewWidthPx: number, ppd: number) {
  const half = (viewWidthPx / 2 / ppd) * DAY_MS;
  const minCenter = TIMELINE_ORIGIN + half;
  return Math.max(minCenter, ms);
}

/** Pixels per day at each discrete zoom snap. */
export const PX_PER_DAY = [0.18, 0.85, 2.4, 8.5, 28, 92];

export function clampZoom(z: number) {
  return Math.min(5, Math.max(0, z));
}

export function pxPerDayAt(zoom: number) {
  const z = clampZoom(zoom);
  const lo = Math.floor(z);
  const hi = Math.ceil(z);
  const t = z - lo;
  return PX_PER_DAY[lo] * (1 - t) + PX_PER_DAY[hi] * t;
}

export function nearestTierIndex(zoom: number) {
  return Math.round(clampZoom(zoom));
}

export function snapZoom(zoom: number) {
  return nearestTierIndex(zoom);
}

export function stepZoom(zoom: number, dir: number) {
  return clampZoom(nearestTierIndex(zoom) + dir);
}

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type DateLocale = 'vi' | 'en';

export function formatDate(
  ms: number,
  { withDay = true, locale = 'vi' }: { withDay?: boolean; locale?: DateLocale } = {}
) {
  const d = new Date(ms);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  if (locale === 'en') {
    const mon = MONTHS_EN[month];
    if (!withDay) return `${mon} ${year}`;
    return `${mon} ${day}, ${year}`;
  }
  if (!withDay) return `${pad(month + 1)}/${year}`;
  return `${pad(day)}/${pad(month + 1)}/${year}`;
}

/** Rewrite ISO (YYYY-MM-DD) or numeric DD/MM/YYYY dates inside stored copy. */
export function localizeDateText(text: string, locale: DateLocale = 'vi') {
  return String(text || '')
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) =>
      formatDate(new Date(Number(y), Number(m) - 1, Number(d)).getTime(), { locale })
    )
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_, d, m, y) =>
      formatDate(new Date(Number(y), Number(m) - 1, Number(d)).getTime(), { locale })
    );
}

export function formatRange(
  start: number,
  end: number,
  zoomIndex: number,
  locale: DateLocale = 'vi'
) {
  const tier = (['5y', '1y', '6m', '1m', 'week', 'day'] as TimelineTierId[])[nearestTierIndex(zoomIndex)];
  if (start === end || end - start < DAY_MS) {
    if (tier === '1y' || tier === '5y') return `${new Date(start).getFullYear()}`;
    if (tier === '1m' || tier === '6m') return formatDate(start, { withDay: false, locale });
    return formatDate(start, { locale });
  }
  const a = new Date(start);
  const b = new Date(end - 1);
  if (tier === '5y' || tier === '1y') {
    if (a.getFullYear() === b.getFullYear()) return String(a.getFullYear());
    return `${a.getFullYear()} — ${b.getFullYear()}`;
  }
  if (tier === '6m' || tier === '1m') {
    return `${formatDate(start, { withDay: false, locale })} — ${formatDate(end - 1, { withDay: false, locale })}`;
  }
  if (a.getFullYear() === b.getFullYear() && locale === 'vi') {
    return `${pad(a.getDate())}/${pad(a.getMonth() + 1)} — ${pad(b.getDate())}/${pad(b.getMonth() + 1)}/${b.getFullYear()}`;
  }
  return `${formatDate(start, { locale })} — ${formatDate(end - 1, { locale })}`;
}

export function toDateInput(ms: number | null | undefined) {
  if (ms == null) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateInput(value: string | null | undefined) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

export function eventSpan(event: Pick<ChronicleEvent, 'start' | 'end'>) {
  const start = event.start;
  const end = event.end && event.end > event.start ? event.end : event.start;
  return { start, end, center: (start + end) / 2, duration: Math.max(DAY_MS, end - start) };
}

export function eventTierRank(event: Pick<ChronicleEvent, 'tier'>) {
  return TIERS.find((t) => t.id === event.tier)?.rank ?? 5;
}

/** Stem + card gap from the timeline line at full size. */
export const TIMELINE_CARD_LIFT = 58;

/** 1 at view center, 0.5 at the left/right edge. */
export function viewProximityScale(xPx: number, viewWidthPx: number) {
  const half = Math.max(1, viewWidthPx / 2);
  const t = Math.min(1, Math.abs(xPx - half) / half);
  const eased = t * t * (3 - 2 * t);
  return 1 - 0.5 * eased;
}

/** Distance scale times +10% per importance tier (5y = +50%, day = +0%). */
export function eventSizeScale(tier: ChronicleEvent['tier'], proximity: number) {
  return proximity * (1 + 0.1 * (5 - eventTierRank({ tier })));
}

export function eventsAtOrAboveTier(events: ChronicleEvent[], maxRank: number) {
  return events
    .filter((e) => eventTierRank(e) <= maxRank)
    .slice()
    .sort((a, b) => eventSpan(a).center - eventSpan(b).center);
}

export function nearestEventAnchor(
  events: ChronicleEvent[],
  aroundMs: number,
  maxRank: number,
  focusId?: string | null
) {
  if (focusId) {
    const focused = events.find((e) => e.id === focusId);
    if (focused) return eventSpan(focused).center;
  }
  const list = eventsAtOrAboveTier(events, maxRank);
  if (!list.length) return aroundMs;
  let best = list[0];
  let bestDist = Infinity;
  for (const e of list) {
    const dist = Math.abs(eventSpan(e).center - aroundMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return eventSpan(best).center;
}

export function neighborEvent(
  events: ChronicleEvent[],
  aroundMs: number,
  maxRank: number,
  dir: -1 | 1
) {
  const list = eventsAtOrAboveTier(events, maxRank);
  if (!list.length) return null;
  if (dir < 0) {
    const prev = list.filter((e) => eventSpan(e).center < aroundMs - 1);
    return prev.length ? prev[prev.length - 1] : null;
  }
  const next = list.filter((e) => eventSpan(e).center > aroundMs + 1);
  return next.length ? next[0] : null;
}

function startOfDay(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function addMonths(ms: number, n: number) {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
}

function startOfWeekMonday(ms: number) {
  const d = new Date(startOfDay(ms));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

export function generateTicks(
  viewStart: number,
  viewEnd: number,
  zoomIndex: number,
  locale: DateLocale = 'vi'
) {
  const tier = (['5y', '1y', '6m', '1m', 'week', 'day'] as TimelineTierId[])[nearestTierIndex(zoomIndex)];
  const ticks: { start: number; end: number; label: string }[] = [];
  const padMs = (viewEnd - viewStart) * 0.08;
  const from = viewStart - padMs;
  const to = viewEnd + padMs;

  if (tier === '5y') {
    const y0 = Math.floor(new Date(from).getFullYear() / 5) * 5;
    for (let y = y0; y <= new Date(to).getFullYear() + 5; y += 5) {
      const start = new Date(y, 0, 1).getTime();
      const end = new Date(y + 5, 0, 1).getTime();
      ticks.push({ start, end, label: `${y} — ${y + 4}` });
    }
  } else if (tier === '1y') {
    const y0 = new Date(from).getFullYear() - 1;
    for (let y = y0; y <= new Date(to).getFullYear() + 1; y++) {
      const start = new Date(y, 0, 1).getTime();
      const end = new Date(y + 1, 0, 1).getTime();
      ticks.push({ start, end, label: `${y}` });
    }
  } else if (tier === '6m') {
    const d = new Date(from);
    let y = d.getFullYear();
    let h = d.getMonth() < 6 ? 0 : 6;
    while (new Date(y, h, 1).getTime() <= to) {
      const start = new Date(y, h, 1).getTime();
      const end = new Date(y, h + 6, 1).getTime();
      ticks.push({
        start,
        end,
        label: `${formatDate(start, { withDay: false, locale })} — ${formatDate(end - DAY_MS, { withDay: false, locale })}`,
      });
      h += 6;
      if (h >= 12) {
        h = 0;
        y += 1;
      }
    }
  } else if (tier === '1m') {
    let cursor = new Date(new Date(from).getFullYear(), new Date(from).getMonth(), 1).getTime();
    while (cursor <= to) {
      const start = cursor;
      const end = addMonths(start, 1);
      ticks.push({
        start,
        end,
        label: formatDate(start, { withDay: false, locale }),
      });
      cursor = end;
    }
  } else if (tier === 'week') {
    let cursor = startOfWeekMonday(from);
    while (cursor <= to) {
      const start = cursor;
      const end = start + 7 * DAY_MS;
      ticks.push({ start, end, label: formatRange(start, end, 4, locale) });
      cursor = end;
    }
  } else {
    let cursor = startOfDay(from);
    while (cursor <= to) {
      const start = cursor;
      const end = start + DAY_MS;
      ticks.push({ start, end, label: formatDate(start, { locale }) });
      cursor = end;
    }
  }

  return ticks.filter((t) => t.end >= viewStart - padMs && t.start <= viewEnd + padMs);
}

export function eventIsPeriodLine(event: Pick<ChronicleEvent, 'approximate'>) {
  return Boolean(event.approximate);
}

export { DAY_MS };
