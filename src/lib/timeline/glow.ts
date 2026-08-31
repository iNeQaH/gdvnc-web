export const GLOW_BY_RATING: Record<string, string> = {
  EPIC: '#f59e0b',
  LEGENDARY: '#ef4444',
  MYTHIC: '#a855f7',
};

export const MAX_GLOW_STOPS = 5;
export const DEFAULT_GLOW_ALPHA = 0.4;
export const DEFAULT_GLOW_SCALE = 0.38;

export type GlowConfig = {
  colors: string[];
  alpha: number;
  scale: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function parseGlowColors(value: unknown): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('{')) {
    try {
      const json = JSON.parse(raw) as { colors?: unknown };
      const fromJson = Array.isArray(json.colors) ? json.colors.join(',') : String(json.colors ?? '');
      return parseGlowColors(fromJson);
    } catch {
      return [];
    }
  }
  const out: string[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const m = part.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) continue;
    out.push(`#${m[1].toLowerCase()}`);
    if (out.length >= MAX_GLOW_STOPS) break;
  }
  return out;
}

export function parseGlowConfig(value: unknown): GlowConfig | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('{')) {
    try {
      const json = JSON.parse(raw) as { colors?: unknown; alpha?: unknown; scale?: unknown };
      const colors = parseGlowColors(Array.isArray(json.colors) ? json.colors.join(',') : json.colors);
      if (!colors.length) return null;
      return {
        colors,
        alpha: clamp(Number(json.alpha ?? DEFAULT_GLOW_ALPHA), 0, 1),
        scale: clamp(Number(json.scale ?? DEFAULT_GLOW_SCALE), 0.15, 1.5),
      };
    } catch {
      return null;
    }
  }
  const colors = parseGlowColors(raw);
  if (!colors.length) return null;
  return { colors, alpha: DEFAULT_GLOW_ALPHA, scale: DEFAULT_GLOW_SCALE };
}

export function serializeGlowConfig(cfg: GlowConfig): string | null {
  const colors = parseGlowColors(cfg.colors.join(','));
  if (!colors.length) return null;
  return JSON.stringify({
    colors,
    alpha: round2(clamp(cfg.alpha, 0, 1)),
    scale: round2(clamp(cfg.scale, 0.15, 1.5)),
  });
}

export function serializeGlowColors(colors: string[]): string | null {
  const parsed = parseGlowColors(colors.join(','));
  if (!parsed.length) return null;
  return serializeGlowConfig({
    colors: parsed,
    alpha: DEFAULT_GLOW_ALPHA,
    scale: DEFAULT_GLOW_SCALE,
  });
}

/** Accepts hex, comma list, or JSON `{ colors, alpha, scale }`. */
export function parseGlowColor(value: unknown): string | null {
  const cfg = parseGlowConfig(value);
  return cfg ? serializeGlowConfig(cfg) : null;
}

export function glowStyleVars(serialized: string | null | undefined): Record<string, string> | undefined {
  const cfg = parseGlowConfig(serialized);
  if (!cfg) return undefined;
  const stops =
    cfg.colors.length === 1
      ? `${cfg.colors[0]}, color-mix(in srgb, ${cfg.colors[0]} 22%, white) 50%, ${cfg.colors[0]}`
      : `${cfg.colors.join(', ')}, ${cfg.colors[0]}`;
  return {
    '--flow-color': cfg.colors[0],
    '--flow-stops': stops,
    '--glow-alpha': String(cfg.alpha),
    '--glow-scale': String(cfg.scale),
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
