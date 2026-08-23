/**
 * ScoringEngine.ts
 * Core Scoring Formula for GDVNC.
 * Hybrid Model: Exponential Base PP + osu! Weighted PP Decay ($0.95^{n-1}$).
 */

export const MAX_PP = 2500;   // Base PP for Top 1 Extreme Demon
export const MIN_PP = 10;     // Base PP for lowest rated Demon (#150)
export const LIST_SIZE = 150; // Main list size

/**
 * Calculates the Base PP for a level based on its placement on the list.
 * Formula: P(x) = MIN_PP * exp(k * (LIST_SIZE - x))
 * @param placement - The rank of the level (1 is hardest)
 */
export function calculateBasePp(placement: number): number {
  if (placement < 1) return 0;
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
  const sorted = [...levels].sort((a, b) => b.basePp - a.basePp);
  let totalPp = 0;
  const items = sorted.map((lvl, index) => {
    const weight = Math.pow(0.95, index);
    const weightedPp = Number((lvl.basePp * weight).toFixed(2));
    totalPp += weightedPp;
    return {
      ...lvl,
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
