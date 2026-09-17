/**
 * ScoringEngine.ts
 * Ranked list: milder exponential so Top 1 is not a huge cliff above nearby ranks.
 * Off-list Insane Demon+ still scores, but on a separate steep decay so farming
 * national / unranked clears cannot overtake players with hard list levels.
 */

export const MAX_PP = 400;
export const MIN_PP = 20;
export const LIST_SIZE = 500;
const BASE_PP_EXP_K = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);

export const RANKED_DECAY = 0.95;
export const UNRANKED_DECAY = 0.7;
export const UNRANKED_MAX_COUNT = 15;
export const MIN_SCORING_DIFFICULTY_FACE = 13;
export const UNRANKED_INSANE_PP = 8;
export const UNRANKED_EXTREME_PP = 14;

/** Pointercrate: reaching the requirement awards 10% of the level's points. */
export const MIN_PROGRESS_SCORE_RATIO = 0.1;

export function unrankedBonusPp(difficultyFace: number | null | undefined): number {
  const face = difficultyFace ?? 0;
  if (face >= 14) return UNRANKED_EXTREME_PP;
  if (face >= MIN_SCORING_DIFFICULTY_FACE) return UNRANKED_INSANE_PP;
  return 0;
}

/**
 * Base PP stored on a level.
 * Ranked placement always wins. Unranked Insane Demon+ get a small bonus.
 */
export function calculateLevelBasePp(
  placement: number | null | undefined,
  difficultyFace?: number | null,
  isChallenge = false
): number {
  if (placement != null && placement >= 1) return calculateBasePp(placement);
  if (isChallenge) return 0;
  return unrankedBonusPp(difficultyFace);
}

/**
 * Awards points for a classic record by progress.
 * At minPercent: 10% of basePp. At 100%: full basePp. Linear in between.
 */
export function awardedPpForProgress(
  progress: number | null | undefined,
  minPercent: number | null | undefined,
  basePp: number
): number {
  const p = progress ?? 0;
  const req = Math.min(100, Math.max(1, minPercent || 100));
  if (p < req) return 0;
  if (p >= 100 || req >= 100) return Number(basePp.toFixed(2));
  const t = (p - req) / (100 - req);
  const ratio = MIN_PROGRESS_SCORE_RATIO + (1 - MIN_PROGRESS_SCORE_RATIO) * t;
  return Number((basePp * ratio).toFixed(2));
}

/**
 * Base PP for a ranked list level.
 * P(x) = MIN_PP * exp(k * (LIST_SIZE - x))
 */
export function calculateBasePp(placement: number | null | undefined): number {
  if (placement == null || placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;

  const pp = MIN_PP * Math.exp(BASE_PP_EXP_K * (LIST_SIZE - placement));
  return Number(pp.toFixed(2));
}

export function calculateTotalPp(basePps: number[], decay = RANKED_DECAY): number {
  if (!basePps || basePps.length === 0) return 0;

  const sorted = [...basePps].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i] * Math.pow(decay, i);
  }
  return Number(total.toFixed(2));
}

export function calculatePlayerPp(rankedPps: number[], unrankedPps: number[] = []): number {
  const ranked = calculateTotalPp(rankedPps, RANKED_DECAY);
  const unranked = calculateTotalPp(unrankedPps.slice(0, UNRANKED_MAX_COUNT), UNRANKED_DECAY);
  return Number((ranked + unranked).toFixed(2));
}

export interface PpBreakdownItem {
  placement: number;
  levelName: string;
  basePp: number;
  weightPercent: number;
  weightedPp: number;
  rankInProfile: number;
}

type BreakdownLevel = {
  awardedPp?: number;
  basePp?: number;
  placement?: number | null;
  name?: string;
  recordId?: string;
};

function awardedOf(lvl: BreakdownLevel): number {
  return typeof lvl.awardedPp === 'number' ? lvl.awardedPp : Number(lvl.basePp || 0);
}

function weighPool(levels: BreakdownLevel[], decay: number, cap: number, rankOffset: number) {
  const sorted = [...levels].sort((a, b) => awardedOf(b) - awardedOf(a));
  const counted = sorted.slice(0, cap);
  const overflow = sorted.slice(cap);
  const items = counted.map((lvl, index) => {
    const weight = Math.pow(decay, index);
    const awardedPp = awardedOf(lvl);
    const weightedPp = Number((awardedPp * weight).toFixed(2));
    return {
      ...lvl,
      awardedPp,
      levelName: lvl.name,
      weightPercent: Number((weight * 100).toFixed(1)),
      weightedPp,
      rankInProfile: rankOffset + index + 1,
    };
  });
  const unused = overflow.map((lvl, index) => ({
    ...lvl,
    awardedPp: awardedOf(lvl),
    levelName: lvl.name,
    weightPercent: 0,
    weightedPp: 0,
    rankInProfile: rankOffset + counted.length + index + 1,
  }));
  const totalPp = items.reduce((sum, item) => sum + item.weightedPp, 0);
  return { items: [...items, ...unused], totalPp };
}

export function getWeightedPpBreakdown(levels: BreakdownLevel[]): {
  totalPp: number;
  items: Array<BreakdownLevel & {
    awardedPp: number;
    levelName: string | undefined;
    weightPercent: number;
    weightedPp: number;
    rankInProfile: number;
  }>;
} {
  const scoring = levels.filter((lvl) => awardedOf(lvl) > 0);
  const ranked = scoring.filter((lvl) => lvl.placement != null);
  const unranked = scoring.filter((lvl) => lvl.placement == null);

  const rankedWeigh = weighPool(ranked, RANKED_DECAY, ranked.length, 0);
  const unrankedWeigh = weighPool(unranked, UNRANKED_DECAY, UNRANKED_MAX_COUNT, rankedWeigh.items.length);
  const totalPp = Number((rankedWeigh.totalPp + unrankedWeigh.totalPp).toFixed(2));

  return {
    totalPp,
    items: [...rankedWeigh.items, ...unrankedWeigh.items],
  };
}
