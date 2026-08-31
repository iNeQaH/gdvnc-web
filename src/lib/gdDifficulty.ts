export type RatingType = 'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export const DIFFICULTY_FACE_MAP: Record<number, string> = {
  0: 'NA',
  1: 'AUTO',
  2: 'EASY',
  3: 'NORMAL',
  4: 'HARD',
  5: 'HARD',
  6: 'HARDER',
  7: 'HARDER',
  8: 'INSANE',
  9: 'INSANE',
  10: 'EASY DEMON',
  11: 'MEDIUM DEMON',
  12: 'HARD DEMON',
  13: 'INSANE DEMON',
  14: 'EXTREME DEMON',
};

export const DIFFICULTY_FILTER_OPTIONS: { val: number; label: string }[] = [
  { val: 0, label: 'NA' },
  { val: 1, label: 'Auto' },
  { val: 2, label: 'Easy' },
  { val: 3, label: 'Normal' },
  { val: 4, label: 'Hard' },
  { val: 6, label: 'Harder' },
  { val: 8, label: 'Insane' },
  { val: 10, label: 'Easy Demon' },
  { val: 11, label: 'Medium Demon' },
  { val: 12, label: 'Hard Demon' },
  { val: 13, label: 'Insane Demon' },
  { val: 14, label: 'Extreme Demon' },
];

/** Pair faces (4/5 Hard, 6/7 Harder, 8/9 Insane) share one filter chip. */
export function canonicalizeDifficultyFace(val: number): number {
  if (val === 5) return 4;
  if (val === 7) return 6;
  if (val === 9) return 8;
  return val;
}

export function matchesDifficultyFilter(face: number, selected: number[]): boolean {
  if (!selected.length) return true;
  const group = canonicalizeDifficultyFace(face);
  return selected.some((s) => canonicalizeDifficultyFace(s) === group);
}

export function getDifficultyFaceUrl(val: number): string {
  const name = DIFFICULTY_FACE_MAP[val] || 'NA';
  return `/difficulties/${name}.png`;
}

export function getRatingIconUrl(ratingType: string | null | undefined): string | null {
  if (!ratingType || ratingType === 'NONE' || ratingType === 'RATE') return null;
  return `/difficulties/${ratingType}.png`;
}

const DIFFICULTY_NAME_TO_FACE: Record<string, number> = {
  unrated: 0,
  'n/a': 0,
  na: 0,
  'not rated': 0,
  auto: 1,
  easy: 2,
  normal: 3,
  hard: 4,
  harder: 6,
  insane: 8,
  demon: 10,
  'easy demon': 10,
  'medium demon': 11,
  'hard demon': 12,
  'insane demon': 13,
  'extreme demon': 14,
};

export function formatDifficultyLabel(face: number, fallback?: string | null): string {
  const labels: Record<number, string> = {
    0: 'N/A',
    1: 'Auto',
    2: 'Easy',
    3: 'Normal',
    4: 'Hard',
    5: 'Hard',
    6: 'Harder',
    7: 'Harder',
    8: 'Insane',
    9: 'Insane',
    10: 'Easy Demon',
    11: 'Medium Demon',
    12: 'Hard Demon',
    13: 'Insane Demon',
    14: 'Extreme Demon',
  };
  if (face in labels) return labels[face];
  return (fallback && String(fallback).trim()) || 'Demon';
}

export function mapDifficultyFace(difficulty: string | null | undefined): number {
  if (!difficulty) return 0;
  const key = String(difficulty).trim().toLowerCase();
  if (key in DIFFICULTY_NAME_TO_FACE) return DIFFICULTY_NAME_TO_FACE[key];
  if (key.includes('extreme')) return 14;
  if (key.includes('insane demon')) return 13;
  if (key.includes('hard demon')) return 12;
  if (key.includes('medium demon')) return 11;
  if (key.includes('easy demon') || key.includes('demon')) return 10;
  return 0;
}

export function mapRatingType(data: any): RatingType {
  const epicRaw = data?.epic;
  const epic = typeof epicRaw === 'string' ? epicRaw.toLowerCase() : '';

  if (epic === 'mythic' || data?.mythic === true) return 'MYTHIC';
  if (epic === 'legendary' || data?.legendary === true) return 'LEGENDARY';
  if (epic === 'epic' || epicRaw === true) return 'EPIC';

  const featured = data?.featured;
  if (featured && featured !== 0 && featured !== '0' && featured !== false) return 'FEATURE';

  return 'NONE';
}
