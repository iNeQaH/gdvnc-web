export const DAY_MS = 86_400_000;

export const TIER_IDS = ['5y', '1y', '6m', '1m', 'week', 'day'] as const;
export type TimelineTierId = (typeof TIER_IDS)[number];
export type TimelineNature = 'positive' | 'negative';

export type ChronicleEvent = {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  start: number;
  end: number;
  approximate: boolean;
  nature: TimelineNature;
  tier: TimelineTierId;
  sourceKey?: string | null;
  glowColor?: string | null;
  imageScale?: number;
};

export const DEFAULT_IMAGE_SCALE = 1;
export const MIN_IMAGE_SCALE = 0.5;
export const MAX_IMAGE_SCALE = 2.5;

export function clampImageScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_IMAGE_SCALE;
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, Math.round(n * 100) / 100));
}

export function isTierId(value: string): value is TimelineTierId {
  return (TIER_IDS as readonly string[]).includes(value);
}

export function isNature(value: string): value is TimelineNature {
  return value === 'positive' || value === 'negative';
}
