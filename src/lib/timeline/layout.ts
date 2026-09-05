import { ALWAYS_SHOW_MARKER_MAX_RANK, TIERS } from '@/lib/timeline/tiers';
import { clampImageScale, type ChronicleEvent } from '@/lib/timeline/types';

export const CARD_W = 200;
const CARD_GAP = 12;
/** Extra lift (px) for each overlapping card so the date marker stays put. */
export const CARD_STACK = 36;
/** Unused after vertical stacking; kept so older callers still type-check. */
export const MAX_CARD_DRIFT = 112;

export function cardWidthFor(event: Pick<ChronicleEvent, 'imageScale'>, base = CARD_W): number {
  return Math.round(base * clampImageScale(event.imageScale));
}

export type LaneItem = {
  event: ChronicleEvent & { anchor: number };
  x: number;
  desiredLeft: number;
  width: number;
  left: number;
  collapsed: boolean;
  stack: number;
};

function tierRank(event: { tier: string }) {
  return TIERS.find((t) => t.id === event.tier)?.rank ?? 5;
}

export function layoutLane({
  events,
  zoomIndex,
  timeToX,
  expandedIds,
  foldedIds,
  cardWidth = CARD_W,
}: {
  events: Array<ChronicleEvent & { anchor: number }>;
  zoomIndex: number;
  timeToX: (ms: number) => number;
  expandedIds: Set<string>;
  foldedIds?: Set<string>;
  cardWidth?: number;
}): LaneItem[] {
  const minShowRank = Math.round(zoomIndex);
  const folded = foldedIds ?? new Set<string>();
  const items: LaneItem[] = events.map((event) => {
    const x = timeToX(event.anchor);
    const width = cardWidthFor(event, cardWidth);
    return {
      event,
      x,
      desiredLeft: x - width / 2,
      width,
      left: x - width / 2,
      collapsed: false,
      stack: 0,
    };
  });

  items.sort((a, b) => a.x - b.x || a.event.id.localeCompare(b.event.id));

  const collapsed: LaneItem[] = [];
  const candidates: LaneItem[] = [];

  for (const item of items) {
    const rank = tierRank(item.event);
    const isFolded = folded.has(item.event.id);
    const forced = expandedIds.has(item.event.id) && !isFolded;
    const visibleAtZoom = rank <= minShowRank;
    const alwaysMark = rank <= ALWAYS_SHOW_MARKER_MAX_RANK;
    const mark = { ...item, collapsed: true as const, left: item.x - 7, width: 14, stack: 0 };

    if (isFolded) {
      collapsed.push(mark);
      continue;
    }
    if (!visibleAtZoom && !forced) {
      if (alwaysMark) collapsed.push(mark);
      continue;
    }
    candidates.push({ ...item, collapsed: false, left: item.desiredLeft, width: item.width, stack: 0 });
  }

  const shown: LaneItem[] = candidates.map((item) => ({
    ...item,
    collapsed: false,
    left: item.desiredLeft,
    width: item.width,
    stack: 0,
  }));

  shown.sort((a, b) => a.x - b.x || a.event.id.localeCompare(b.event.id));

  for (let i = 0; i < shown.length; i++) {
    const item = shown[i];
    const used = new Set<number>();
    for (let j = 0; j < i; j++) {
      const other = shown[j];
      if (item.left < other.left + other.width + CARD_GAP && other.left < item.left + item.width + CARD_GAP) {
        used.add(other.stack);
      }
    }
    let stack = 0;
    while (used.has(stack)) stack += 1;
    item.stack = stack;
  }

  return [...shown, ...collapsed];
}

export function clusterCollapsed(items: LaneItem[]) {
  const collapsed = items.filter((i) => i.collapsed);
  collapsed.sort((a, b) => a.x - b.x);
  const clusters: { x: number; items: LaneItem[] }[] = [];
  const threshold = 18;
  for (const item of collapsed) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(item.x - last.x) < threshold) {
      last.items.push(item);
      last.x = last.items.reduce((s, it) => s + it.x, 0) / last.items.length;
    } else {
      clusters.push({ x: item.x, items: [item] });
    }
  }
  return clusters;
}

export function clusterLeadTier(items: LaneItem[]) {
  let best = items[0]?.event.tier ?? 'day';
  let bestRank = 99;
  for (const item of items) {
    const rank = tierRank(item.event);
    if (rank < bestRank) {
      bestRank = rank;
      best = item.event.tier;
    }
  }
  return best;
}
