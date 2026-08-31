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
};

export function isTierId(value: string): value is TimelineTierId {
  return (TIER_IDS as readonly string[]).includes(value);
}

export function isNature(value: string): value is TimelineNature {
  return value === 'positive' || value === 'negative';
}
