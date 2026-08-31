export const GLOW_BY_RATING: Record<string, string> = {
  EPIC: '#f59e0b',
  LEGENDARY: '#ef4444',
  MYTHIC: '#a855f7',
};

export const MAX_GLOW_STOPS = 5;

const HEX6 = /^#([0-9a-fA-F]{6})$/;

export function parseGlowColors(value: unknown): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const m = part.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) continue;
    const hex = `#${m[1].toLowerCase()}`;
    out.push(hex);
    if (out.length >= MAX_GLOW_STOPS) break;
  }
  return out;
}

export function serializeGlowColors(colors: string[]): string | null {
  const parsed = parseGlowColors(colors.join(','));
  return parsed.length ? parsed.join(',') : null;
}

/** Accepts one hex or a comma-separated gradient (max 5). */
export function parseGlowColor(value: unknown): string | null {
  return serializeGlowColors(parseGlowColors(value));
}

export function glowStyleVars(serialized: string | null | undefined): Record<string, string> | undefined {
  const colors = parseGlowColors(serialized);
  if (!colors.length) return undefined;
  const loop =
    colors.length === 1
      ? `${colors[0]}, color-mix(in srgb, ${colors[0]} 18%, transparent) 24%, color-mix(in srgb, ${colors[0]} 82%, white) 50%, color-mix(in srgb, ${colors[0]} 18%, transparent) 76%, ${colors[0]}`
      : `${colors.join(', ')}, ${colors[0]}`;
  return {
    '--flow-color': colors[0],
    '--flow-border': `conic-gradient(from var(--tl-spin, 0deg), ${loop})`,
  };
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
