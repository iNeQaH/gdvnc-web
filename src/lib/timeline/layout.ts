import { ALWAYS_SHOW_MARKER_MAX_RANK, TIERS } from '@/lib/timeline/tiers';
import type { ChronicleEvent } from '@/lib/timeline/types';

export const CARD_W = 200;
const CARD_GAP = 22;

export type LaneItem = {
  event: ChronicleEvent & { anchor: number };
  x: number;
  desiredLeft: number;
  width: number;
  left: number;
  collapsed: boolean;
};

function overlaps(aLeft: number, aRight: number, bLeft: number, bRight: number) {
  return aLeft < bRight && aRight > bLeft;
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
    };
  });

  items.sort((a, b) => {
    const ra = TIERS.find((t) => t.id === a.event.tier)?.rank ?? 5;
    const rb = TIERS.find((t) => t.id === b.event.tier)?.rank ?? 5;
    if (ra !== rb) return ra - rb;
    return a.x - b.x;
  });

  const placed: LaneItem[] = [];
  for (const item of items) {
    const rank = TIERS.find((t) => t.id === item.event.tier)?.rank ?? 5;
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
      (p) => !p.collapsed && overlaps(left, right, p.left, p.left + p.width)
    );
    if (hit && !forced) {
      placed.push({ ...item, collapsed: true, left: item.x - 7, width: 14 });
      continue;
    }

    placed.push({ ...item, collapsed: false, left, width: cardWidth });
  }

  resolvePushes(placed, expandedIds, cardWidth);
  return placed;
}

function resolvePushes(placed: LaneItem[], expandedIds: Set<string>, cardWidth: number) {
  const shown = placed.filter((p) => !p.collapsed);
  if (!shown.length) return;

  for (let iter = 0; iter < 12; iter++) {
    shown.sort((a, b) => a.left - b.left);
    let moved = false;
    for (let i = 1; i < shown.length; i++) {
      const prev = shown[i - 1];
      const cur = shown[i];
      const minLeft = prev.left + prev.width + CARD_GAP;
      if (cur.left >= minLeft) continue;
      const overlapAmt = minLeft - cur.left;
      const curExp = expandedIds.has(cur.event.id);
      const prevExp = expandedIds.has(prev.event.id);
      if (curExp && !prevExp) {
        prev.left -= overlapAmt * 0.55;
        cur.left += overlapAmt * 0.45;
      } else if (prevExp && !curExp) {
        cur.left += overlapAmt;
      } else {
        prev.left -= overlapAmt / 2;
        cur.left += overlapAmt / 2;
      }
      moved = true;
    }
    if (!moved) break;
  }

  for (const p of shown) {
    p.width = cardWidth;
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
    const rank = TIERS.find((t) => t.id === item.event.tier)?.rank ?? 5;
    if (rank < bestRank) {
      bestRank = rank;
      best = item.event.tier;
    }
  }
  return best;
}
