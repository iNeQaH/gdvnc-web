import { ALWAYS_SHOW_MARKER_MAX_RANK, TIERS } from '@/lib/timeline/tiers';
import type { ChronicleEvent } from '@/lib/timeline/types';

export const CARD_W = 200;
const CARD_GAP = 16;
/** Extra lift (px) per stacked card so nearby events stay on their date. */
export const CARD_STACK = 176;

export type LaneItem = {
  event: ChronicleEvent & { anchor: number };
  x: number;
  desiredLeft: number;
  width: number;
  left: number;
  collapsed: boolean;
  stack: number;
};

function overlaps(aLeft: number, aRight: number, bLeft: number, bRight: number) {
  return aLeft < bRight && aRight > bLeft;
}

function tierRank(event: { tier: string }) {
  return TIERS.find((t) => t.id === event.tier)?.rank ?? 5;
}

export function layoutLane({
  events,
  zoomIndex,
  timeToX,
  expandedIds,
  cardWidth = CARD_W,
}: {
  events: Array<ChronicleEvent & { anchor: number }>;
  zoomIndex: number;
  timeToX: (ms: number) => number;
  expandedIds: Set<string>;
  cardWidth?: number;
}): LaneItem[] {
  const minShowRank = Math.round(zoomIndex);
  const items: LaneItem[] = events.map((event) => {
    const x = timeToX(event.anchor);
    return {
      event,
      x,
      desiredLeft: x - cardWidth / 2,
      width: cardWidth,
      left: x - cardWidth / 2,
      collapsed: false,
      stack: 0,
    };
  });

  items.sort((a, b) => {
    const ra = tierRank(a.event);
    const rb = tierRank(b.event);
    if (ra !== rb) return ra - rb;
    return a.x - b.x;
  });

  const placed: LaneItem[] = [];
  for (const item of items) {
    const rank = tierRank(item.event);
    const forced = expandedIds.has(item.event.id);
    const visibleAtZoom = rank <= minShowRank;
    const alwaysMark = rank <= ALWAYS_SHOW_MARKER_MAX_RANK;
    const left = item.desiredLeft;
    const right = left + cardWidth;

    if (!visibleAtZoom && !forced) {
      if (!alwaysMark) continue;
      placed.push({ ...item, collapsed: true, left: item.x - 7, width: 14 });
      continue;
    }

    const hit = placed.some(
      (p) => !p.collapsed && overlaps(left - CARD_GAP, right + CARD_GAP, p.left, p.left + p.width)
    );
    if (hit && !forced) {
      placed.push({ ...item, collapsed: true, left: item.x - 7, width: 14 });
      continue;
    }

    placed.push({ ...item, collapsed: false, left, width: cardWidth });
  }

  assignStacks(placed, cardWidth);
  return placed;
}

function assignStacks(placed: LaneItem[], cardWidth: number) {
  const shown = placed.filter((p) => !p.collapsed);
  shown.sort((a, b) => a.x - b.x || a.event.id.localeCompare(b.event.id));
  for (let i = 0; i < shown.length; i++) {
    const cur = shown[i];
    cur.left = cur.desiredLeft;
    cur.width = cardWidth;
    let stack = 0;
    for (let j = 0; j < i; j++) {
      const prev = shown[j];
      if (
        !overlaps(
          cur.left - CARD_GAP,
          cur.left + cardWidth + CARD_GAP,
          prev.left,
          prev.left + prev.width
        )
      ) {
        continue;
      }
      stack = Math.max(stack, prev.stack + 1);
    }
    cur.stack = stack;
  }
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
