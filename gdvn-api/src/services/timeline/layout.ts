import { ALWAYS_SHOW_MARKER_MAX_RANK, TIERS } from '@/services/timeline/tiers';
import { clampImageScale, type ChronicleEvent } from '@/services/timeline/types';

export const CARD_W = 200;
const CARD_GAP = 16;
/** Cards no longer stack vertically. Kept so older callers still type-check. */
export const CARD_STACK = 0;
/** If a card would slide farther than this from its date, collapse it to a dot. */
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

  const shown: LaneItem[] = [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const item: LaneItem = { ...candidates[i], left: candidates[i].desiredLeft, width: candidates[i].width, stack: 0 };
    const next = shown[0];
    if (next) {
      const maxLeft = next.left - CARD_GAP - item.width;
      if (item.left > maxLeft) item.left = maxLeft;
    }
    const cardCenter = item.left + item.width / 2;
    const drift = item.x - cardCenter;
    const forced = expandedIds.has(item.event.id) && !folded.has(item.event.id);
    if (drift > MAX_CARD_DRIFT && !forced) {
      collapsed.push({ ...item, collapsed: true, left: item.x - 7, width: 14, stack: 0 });
      continue;
    }
    shown.unshift(item);
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
