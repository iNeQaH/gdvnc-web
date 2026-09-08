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

export function isDemonDifficultyFace(face: number | null | undefined): boolean {
  return (face ?? 0) >= 10;
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

function clipGdField(value: unknown): string {
  const s = String(value ?? '').trim();
  if (!s || s === '-' || /^unknown$/i.test(s)) return '';
  return s;
}

export function pickGdLevelName(data: any): string {
  return clipGdField(data?.name) || clipGdField(data?.levelName);
}

export function pickGdCreatorName(data: any): string {
  return (
    clipGdField(data?.author) ||
    clipGdField(data?.creator) ||
    clipGdField(data?.username) ||
    clipGdField(data?.player)
  );
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

export function mapDifficultyFace(input: any): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 && input <= 14 ? input : 0;
  }

  let difficultyStr = '';
  let faceStr = '';
  let isDemon = false;

  if (typeof input === 'object') {
    difficultyStr = String(input.difficulty || '').trim().toLowerCase();
    faceStr = String(input.difficultyFace || '').trim().toLowerCase();
    isDemon = Boolean(input.demon || input.isDemon || difficultyStr.includes('demon') || faceStr.includes('demon'));
  } else {
    difficultyStr = String(input).trim().toLowerCase();
    isDemon = difficultyStr.includes('demon');
  }

  if (faceStr) {
    if (faceStr.includes('demon-extreme') || faceStr.includes('extreme')) return 14;
    if (faceStr.includes('demon-insane')) return 13;
    if (faceStr.includes('demon-hard')) return 12;
    if (faceStr.includes('demon-medium')) return 11;
    if (faceStr.includes('demon-easy')) return 10;
  }

  if (isDemon) {
    if (difficultyStr.includes('extreme')) return 14;
    if (difficultyStr.includes('insane')) return 13;
    if (difficultyStr.includes('hard')) return 12;
    if (difficultyStr.includes('medium')) return 11;
    if (difficultyStr.includes('easy')) return 10;
    return 10;
  }

  if (difficultyStr in DIFFICULTY_NAME_TO_FACE) {
    return DIFFICULTY_NAME_TO_FACE[difficultyStr];
  }

  if (difficultyStr.includes('extreme')) return 14;
  if (difficultyStr.includes('insane demon')) return 13;
  if (difficultyStr.includes('insane')) return 8;
  if (difficultyStr.includes('harder')) return 6;
  if (difficultyStr.includes('hard')) return 4;
  if (difficultyStr.includes('normal')) return 3;
  if (difficultyStr.includes('easy')) return 2;
  if (difficultyStr.includes('auto')) return 1;

  return 0;
}

export function mapRatingType(data: any): RatingType {
  if (!data) return 'NONE';

  if (typeof data === 'string') {
    const s = data.trim().toUpperCase();
    if (['FEATURE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'RATE'].includes(s)) {
      return s as RatingType;
    }
  }

  const epicRaw = data.epic;
  const epicStr = typeof epicRaw === 'string' ? epicRaw.toLowerCase() : '';
  if (epicRaw === 3 || epicRaw === '3' || epicStr === 'mythic' || data.mythic === true) return 'MYTHIC';
  if (epicRaw === 2 || epicRaw === '2' || epicStr === 'legendary' || data.legendary === true) return 'LEGENDARY';
  if (epicRaw === 1 || epicRaw === '1' || epicStr === 'epic' || epicRaw === true) return 'EPIC';

  const ratingStr = String(data.rating || '').toLowerCase();
  if (ratingStr.includes('mythic')) return 'MYTHIC';
  if (ratingStr.includes('legendary')) return 'LEGENDARY';
  if (ratingStr.includes('epic')) return 'EPIC';
  if (ratingStr.includes('feature')) return 'FEATURE';

  const featured = data.featured;
  if (featured && featured !== 0 && featured !== '0' && featured !== false) return 'FEATURE';

  if (data.stars > 0 || data.rated || ratingStr.includes('star')) return 'RATE';

  return 'NONE';
}
