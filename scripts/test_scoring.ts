import {
  calculateBasePp,
  calculateLevelBasePp,
  calculatePlayerPp,
  MAX_PP,
  MIN_PP,
  UNRANKED_EXTREME_PP,
  UNRANKED_INSANE_PP,
} from '../src/lib/ScoringEngine';

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function almost(a: number, b: number, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

assert(almost(calculateBasePp(1), MAX_PP), `Top 1 should be ${MAX_PP}`);
assert(almost(calculateBasePp(500), MIN_PP), `#500 should be ${MIN_PP}`);
assert(calculateBasePp(1) / calculateBasePp(50) < 1.4, 'Top 1 vs #50 gap should stay under 1.4x');
assert(calculateBasePp(1) / calculateBasePp(150) < 2.5, 'Top 1 vs #150 gap should stay under 2.5x');

assert(calculateLevelBasePp(null, 12) === 0, 'Hard Demon unranked scores 0');
assert(calculateLevelBasePp(null, 13) === UNRANKED_INSANE_PP, 'Insane Demon unranked scores a bonus');
assert(calculateLevelBasePp(null, 14) === UNRANKED_EXTREME_PP, 'Extreme Demon unranked scores a bonus');
assert(calculateLevelBasePp(10, 14) === calculateBasePp(10), 'Ranked placement beats difficulty bonus');
assert(calculateLevelBasePp(null, 14, true) === 0, 'Challenge unranked scores 0');

const farmExtremes = calculatePlayerPp([], Array(100).fill(UNRANKED_EXTREME_PP));
const farmInsanes = calculatePlayerPp([], Array(100).fill(UNRANKED_INSANE_PP));
assert(farmExtremes < calculateBasePp(75), 'Farming 100 unranked extremes stays below one #75');
assert(farmInsanes < calculateBasePp(150), 'Farming 100 unranked insanes stays below one #150');
assert(farmExtremes < calculateBasePp(1), 'Farming unranked cannot beat Top 1');

const topPlayer = calculatePlayerPp([calculateBasePp(1), calculateBasePp(5), calculateBasePp(20)]);
const farmer = calculatePlayerPp([], Array(80).fill(UNRANKED_EXTREME_PP).concat(Array(80).fill(UNRANKED_INSANE_PP)));
assert(topPlayer > farmer, 'A player with hard list levels stays above an unranked farmer');

console.log('scoring invariants ok', {
  top1: calculateBasePp(1),
  n50: calculateBasePp(50),
  n75: calculateBasePp(75),
  n150: calculateBasePp(150),
  farmExtremes,
  topPlayer,
  farmer,
});
