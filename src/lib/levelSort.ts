export function isRankedPlacement(placement: number | null | undefined): placement is number {
  return placement != null && placement >= 1;
}

export function isLegacyTier(placement: number | null | undefined): boolean {
  return !isRankedPlacement(placement) || placement > 500;
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
