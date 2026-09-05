/**
 * ScoringEngine.ts
 * Core Scoring Formula for GDVN.
 * Hybrid Model: Exponential Base PP + osu! Weighted PP Decay ($0.95^{n-1}$).
 */

export const MAX_PP = 2500;   // Base PP for Top 1 Extreme Demon
export const MIN_PP = 10;     // Base PP for lowest rated Demon (#500)
export const LIST_SIZE = 500; // Main list size
/** Pointercrate: reaching the requirement awards 10% of the level's points. */
export const MIN_PROGRESS_SCORE_RATIO = 0.1;

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
 * Calculates the Base PP for a level based on its placement on the list.
 * Formula: P(x) = MIN_PP * exp(k * (LIST_SIZE - x))
 * @param placement - The rank of the level (1 is hardest)
 */
export function calculateBasePp(placement: number | null | undefined): number {
  if (placement == null || placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;

  const k = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);
  const pp = MIN_PP * Math.exp(k * (LIST_SIZE - placement));
  return Number(pp.toFixed(2));
}

/**
 * Calculates the total Weighted PP for a player from their list of completions.
 * Total PP = Sum(BasePP_i * 0.95^(i-1)) where list is sorted descending.
 * @param basePps - Array of Base PP values
 */
export function calculateTotalPp(basePps: number[]): number {
  if (!basePps || basePps.length === 0) return 0;

  const sorted = [...basePps].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i] * Math.pow(0.95, i);
  }
  return Number(total.toFixed(2));
}

/**
 * Detailed breakdown of each play and its weighted contribution
 */
export interface PpBreakdownItem {
  placement: number;
  levelName: string;
  basePp: number;
  weightPercent: number; // e.g. 100%, 95%, 90.25%
  weightedPp: number;
  rankInProfile: number;
}

export function getWeightedPpBreakdown(levels: any[]): {
  totalPp: number;
  items: any[];
} {
  const awardedOf = (lvl: any) =>
    typeof lvl.awardedPp === 'number' ? lvl.awardedPp : lvl.basePp;
  const sorted = [...levels].sort((a, b) => awardedOf(b) - awardedOf(a));
  let totalPp = 0;
  const items = sorted.map((lvl, index) => {
    const weight = Math.pow(0.95, index);
    const awardedPp = awardedOf(lvl);
    const weightedPp = Number((awardedPp * weight).toFixed(2));
    totalPp += weightedPp;
    return {
      ...lvl,
      awardedPp,
      levelName: lvl.name,
      weightPercent: Number((weight * 100).toFixed(1)),
      weightedPp,
      rankInProfile: index + 1,
    };
  });

  return {
    totalPp: Number(totalPp.toFixed(2)),
    items,
  };
}
