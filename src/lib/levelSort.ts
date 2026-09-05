export const LIST_MAIN_MAX = 75;
export const LIST_EXTENDED_MIN = 76;
export const LIST_EXTENDED_MAX = 150;
export const LIST_LEGACY_MIN = 151;

export function isRankedPlacement(placement: number | null | undefined): placement is number {
  return placement != null && placement >= 1;
}

export function isMainListPlacement(placement: number | null | undefined): boolean {
  return isRankedPlacement(placement) && placement <= LIST_MAIN_MAX;
}

export function isExtendedListPlacement(placement: number | null | undefined): boolean {
  return isRankedPlacement(placement) && placement >= LIST_EXTENDED_MIN && placement <= LIST_EXTENDED_MAX;
}

/** List filter: 151+ or unranked (PP still uses LIST_SIZE 500). */
export function isLegacyTier(placement: number | null | undefined): boolean {
  return !isRankedPlacement(placement) || placement >= LIST_LEGACY_MIN;
}

export function placementMatchesTiers(
  placement: number | null | undefined,
  tiers: string[]
): boolean {
  if (tiers.length === 0) return true;
  if (tiers.includes('MAIN') && isMainListPlacement(placement)) return true;
  if (tiers.includes('EXTENDED') && isExtendedListPlacement(placement)) return true;
  if (tiers.includes('LEGACY') && isLegacyTier(placement)) return true;
  return false;
}

export function compareListLevels(
  a: { placement?: number | null; difficultyFace?: number | null; name?: string | null },
  b: { placement?: number | null; difficultyFace?: number | null; name?: string | null }
): number {
  const aPlace = a.placement;
  const bPlace = b.placement;
  const aRanked = isRankedPlacement(aPlace);
  const bRanked = isRankedPlacement(bPlace);
  if (aRanked && bRanked) {
    if (aPlace !== bPlace) return aPlace - bPlace;
  } else if (aRanked !== bRanked) {
    return aRanked ? -1 : 1;
  }
  const face = (b.difficultyFace ?? 0) - (a.difficultyFace ?? 0);
  if (face !== 0) return face;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

export function isMainOrExtendedPlacement(placement: number | null | undefined): boolean {
  return isRankedPlacement(placement) && placement <= LIST_EXTENDED_MAX;
}

export function compareVnListLevels(
  a: { vnPlacement?: number | null; difficultyFace?: number | null; name?: string | null },
  b: { vnPlacement?: number | null; difficultyFace?: number | null; name?: string | null }
): number {
  return compareListLevels(
    { placement: a.vnPlacement, difficultyFace: a.difficultyFace, name: a.name },
    { placement: b.vnPlacement, difficultyFace: b.difficultyFace, name: b.name }
  );
}
