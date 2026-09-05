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
  imageRatio?: string | null;
};

export const DEFAULT_IMAGE_SCALE = 1;
export const MIN_IMAGE_SCALE = 0.5;
export const MAX_IMAGE_SCALE = 2.5;

export function clampImageScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_IMAGE_SCALE;
  const scaled = n > MAX_IMAGE_SCALE && n <= MAX_IMAGE_SCALE * 100 ? n / 100 : n;
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, Math.round(scaled * 100) / 100));
}

export function parseImageRatio(value: unknown): number | null {
  const s = String(value ?? '').trim().replace(',', '.');
  if (!s) return null;
  const pair = s.match(/^(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)$/i);
  if (pair) {
    const w = Number(pair[1]);
    const h = Number(pair[2]);
    if (w > 0 && h > 0 && w / h >= 0.2 && w / h <= 8) return w / h;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0.2 && n <= 8) return n;
  return null;
}

export function normalizeImageRatio(value: unknown): string | null {
  const s = String(value ?? '').trim();
  if (!parseImageRatio(s)) return null;
  return s.replace(/\s+/g, '').slice(0, 16);
}

export function isTierId(value: string): value is TimelineTierId {
  return (TIER_IDS as readonly string[]).includes(value);
}

export function isNature(value: string): value is TimelineNature {
  return value === 'positive' || value === 'negative';
}
