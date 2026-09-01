import { DAY_MS, type TimelineTierId } from '@/lib/timeline/types';

export type TimelineTier = {
  id: TimelineTierId;
  rank: number;
  spanMs: number;
};

export const TIERS: TimelineTier[] = [
  { id: '5y', rank: 0, spanMs: 5 * 365.25 * DAY_MS },
  { id: '1y', rank: 1, spanMs: 365.25 * DAY_MS },
  { id: '6m', rank: 2, spanMs: 182.625 * DAY_MS },
  { id: '1m', rank: 3, spanMs: 30.4375 * DAY_MS },
  { id: 'week', rank: 4, spanMs: 7 * DAY_MS },
  { id: 'day', rank: 5, spanMs: DAY_MS },
];

export const TIER_BY_LOOKUP: Record<string, TimelineTier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
);

/** Default timeline zoom: Tuần / Week. */
export const DEFAULT_ZOOM_INDEX = TIERS.findIndex((t) => t.id === 'week');

/** 6m and coarser (5y, 1y, 6m) always keep markers on the bar. */
export const ALWAYS_SHOW_MARKER_MAX_RANK = TIERS.find((t) => t.id === '6m')?.rank ?? 2;
