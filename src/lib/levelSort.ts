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
  const aRanked = isRankedPlacement(a.placement);
  const bRanked = isRankedPlacement(b.placement);
  if (aRanked && bRanked) {
    if (a.placement !== b.placement) return a.placement - b.placement;
  } else if (aRanked !== bRanked) {
    return aRanked ? -1 : 1;
  }
  const face = (b.difficultyFace ?? 0) - (a.difficultyFace ?? 0);
  if (face !== 0) return face;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}
