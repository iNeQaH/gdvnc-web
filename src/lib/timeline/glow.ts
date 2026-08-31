export const GLOW_BY_RATING: Record<string, string> = {
  EPIC: '#f59e0b',
  LEGENDARY: '#ef4444',
  MYTHIC: '#a855f7',
};

const HEX6 = /^#([0-9a-fA-F]{6})$/;

export function parseGlowColor(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const m = raw.match(HEX6);
  return m ? `#${m[1].toLowerCase()}` : null;
}

export function glowForRating(rating: string): string | null {
  return GLOW_BY_RATING[rating] ?? null;
}

export function youtubeThumbUrl(id: string | null | undefined): string | null {
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function isYoutubeThumb(url: string | null | undefined) {
  return Boolean(url && /img\.youtube\.com\/vi\//i.test(url));
}

export function parseYoutubeVideoField(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}
