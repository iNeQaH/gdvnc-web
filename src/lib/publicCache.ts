import { revalidateTag, unstable_cache } from 'next/cache';

export const CACHE_TAGS = {
  leaderboard: 'public-leaderboard',
  highlights: 'public-highlights',
  levels: 'public-levels',
  timeline: 'public-timeline',
  faq: 'public-faq',
  siteLock: 'site-lock',
} as const;

/** Browser 1 phút, CDN 5 phút, SWR 30 phút — API public không phụ thuộc cookie. */
export const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800',
  'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
} as const;

export const SHORT_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
  'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
} as const;

export function bustPublicCache(...tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }
}

export function cachedJson<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds = 300
): Promise<T> {
  const cached = unstable_cache(
    async () => JSON.parse(JSON.stringify(await fn())) as T,
    keyParts,
    { revalidate: revalidateSeconds, tags }
  );
  return cached();
}
