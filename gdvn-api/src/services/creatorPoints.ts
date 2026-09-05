export const DECO_BADGE_CP: Record<string, number> = {
  star: 1,
  feature: 2,
  featured: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

export const LAYOUT_BADGE_CP: Record<string, number> = {
  beginner: 0.1,
  normal: 0.2,
  good: 1,
  cool: 2,
  professional: 3,
};

export const DECO_BADGE_ORDER = ['Star', 'Feature', 'Epic', 'Legendary', 'Mythic'] as const;
export const LAYOUT_BADGE_ORDER = ['Beginner', 'Normal', 'Good', 'Cool', 'Professional'] as const;

function normalizeBadgeName(name: string): string {
  return String(name || '').trim().toLowerCase();
}

export function getDecoBadgeCp(name: string): number | null {
  const key = normalizeBadgeName(name);
  if (key in DECO_BADGE_CP) return DECO_BADGE_CP[key];
  if (key.includes('mythic')) return DECO_BADGE_CP.mythic;
  if (key.includes('legendary')) return DECO_BADGE_CP.legendary;
  if (key.includes('epic')) return DECO_BADGE_CP.epic;
  if (key.includes('feature')) return DECO_BADGE_CP.feature;
  if (key.includes('rated') || key.includes('star')) return DECO_BADGE_CP.star;
  return null;
}

export function getLayoutBadgeCp(name: string): number | null {
  const key = normalizeBadgeName(name);
  if (key in LAYOUT_BADGE_CP) return LAYOUT_BADGE_CP[key];
  if (key.includes('professional')) return LAYOUT_BADGE_CP.professional;
  if (key.includes('cool')) return LAYOUT_BADGE_CP.cool;
  if (key.includes('good')) return LAYOUT_BADGE_CP.good;
  if (key.includes('beginner')) return LAYOUT_BADGE_CP.beginner;
  if (key.includes('normal')) return LAYOUT_BADGE_CP.normal;
  return null;
}

export function isDecoBadgeName(name: string): boolean {
  return getDecoBadgeCp(name) !== null;
}

export function isLayoutBadgeName(name: string): boolean {
  return getLayoutBadgeCp(name) !== null;
}

export function isDecoCategory(badge: { badgeCategory?: { name?: string | null } | null }): boolean {
  return String(badge.badgeCategory?.name || '').toLowerCase().includes('deco');
}

export function isLayoutCategory(badge: { badgeCategory?: { name?: string | null } | null }): boolean {
  return String(badge.badgeCategory?.name || '').toLowerCase().includes('layout');
}

export type QualityBadge = {
  id: string;
  name: string;
  icon: string;
  color?: string | null;
  glowColor?: string | null;
};

type BadgeLike = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  glowColor?: string | null;
  sortOrder?: number | null;
  badgeCategory?: { name?: string | null } | null;
};

function categoryName(badge: BadgeLike): string {
  return String(badge.badgeCategory?.name || '').toLowerCase();
}

/** Highest-quality Deco and Layout badges for a player (one each). */
export function pickDecoAndLayoutBadges(badges: BadgeLike[]): {
  deco: QualityBadge | null;
  layout: QualityBadge | null;
} {
  let deco: { badge: QualityBadge; score: number } | null = null;
  let layout: { badge: QualityBadge; score: number } | null = null;

  for (const badge of badges) {
    const cat = categoryName(badge);
    const mapped: QualityBadge = {
      id: badge.id,
      name: badge.name,
      icon: badge.icon || 'Star',
      color: badge.color,
      glowColor: badge.glowColor,
    };

    if (isDecoCategory(badge) || cat.includes('deco') || isDecoBadgeName(badge.name)) {
      const score = getDecoBadgeCp(badge.name) ?? 1000 - (badge.sortOrder ?? 0);
      if (!deco || score > deco.score) deco = { badge: mapped, score };
    }
    if (isLayoutCategory(badge) || cat.includes('layout') || isLayoutBadgeName(badge.name)) {
      const score = getLayoutBadgeCp(badge.name) ?? 1000 - (badge.sortOrder ?? 0);
      if (!layout || score > layout.score) layout = { badge: mapped, score };
    }
  }

  return { deco: deco?.badge || null, layout: layout?.badge || null };
}

export function formatCp(value: number | null | undefined): string {
  const n = Number(value || 0);
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function roundCp(value: number): number {
  return Math.round(value * 10) / 10;
}

/** CP from a level's GD rating (same scale as deco badges). */
export function cpFromLevelRating(ratingType: string | null | undefined): number {
  const key = String(ratingType || '').trim().toLowerCase();
  if (!key || key === 'none' || key === 'unrated') return 0;
  if (key === 'mythic') return 5;
  if (key === 'legendary') return 4;
  if (key === 'epic') return 3;
  if (key === 'feature' || key === 'featured') return 2;
  if (key === 'rate' || key === 'rated' || key === 'star') return 1;
  return getDecoBadgeCp(key) ?? 0;
}

export function cpFromVnLevels(
  levels: Array<{ ratingType?: string | null }>
): number {
  return roundCp(
    levels.reduce((sum, lvl) => {
      const fromRating = cpFromLevelRating(lvl.ratingType);
      return sum + (fromRating > 0 ? fromRating : 1);
    }, 0)
  );
}

export function computeCreatorPointsFromBadges(
  badgeNames: string[],
  extraCp = 0
): number {
  let deco = 0;
  let layout = 0;

  for (const name of badgeNames) {
    const decoVal = getDecoBadgeCp(name);
    if (decoVal !== null) deco = Math.max(deco, decoVal);
    const layoutVal = getLayoutBadgeCp(name);
    if (layoutVal !== null) layout = Math.max(layout, layoutVal);
  }

  return roundCp(deco + layout + (Number(extraCp) || 0));
}
