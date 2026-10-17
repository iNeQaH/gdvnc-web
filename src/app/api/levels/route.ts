import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, Prisma, RecordStatus } from '@prisma/client';
import {
  compareListLevels,
  compareVnListLevels,
  placementMatchesTiers,
} from '@/lib/levelSort';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';
import { isDemonDifficultyFace, mapDifficultyFace, matchesDifficultyFilter } from '@/lib/gdDifficulty';
import { publicApiError } from '@/lib/apiError';

const dbLevelSelect = {
  id: true,
  gdLevelId: true,
  name: true,
  mode: true,
  difficulty: true,
  difficultyFace: true,
  ratingType: true,
  isVN: true,
  isChallenge: true,
  placement: true,
  vnPlacement: true,
  classicRank: true,
  basePp: true,
  minPercent: true,
  creatorName: true,
  youtubeId: true,
  description: true,
  creator: {
    select: {
      creatorPoints: true,
    },
  },
} as const;

type DbLevelRow = Prisma.LevelGetPayload<{ select: typeof dbLevelSelect }>;

function tierFieldWhere(
  field: 'placement' | 'vnPlacement' | 'classicRank',
  tiers: string[]
): Prisma.LevelWhereInput | null {
  if (!tiers.length) return null;
  const or: Prisma.LevelWhereInput[] = [];
  if (tiers.includes('MAIN')) {
    or.push({ [field]: { gte: 1, lte: 75 } } as Prisma.LevelWhereInput);
  }
  if (tiers.includes('EXTENDED')) {
    or.push({ [field]: { gte: 76, lte: 150 } } as Prisma.LevelWhereInput);
  }
  if (tiers.includes('LEGACY')) {
    or.push({
      OR: [{ [field]: { gte: 151 } }, { [field]: null }],
    } as Prisma.LevelWhereInput);
  }
  return or.length ? { OR: or } : null;
}

async function attachVictorCounts<T extends { id: string }>(levels: T[]) {
  const ids = levels.map((row) => row.id);
  const counts = ids.length
    ? await prisma.record.groupBy({
        by: ['levelId'],
        where: { status: RecordStatus.APPROVED, levelId: { in: ids } },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(counts.map((row) => [row.levelId, row._count._all]));
  return levels.map((row) => ({
    ...row,
    victorCount: countMap.get(row.id) || 0,
  }));
}

function mapLevelFaces<T extends DbLevelRow>(levels: T[]) {
  return levels.map((row) => {
    const face =
      row.difficultyFace && row.difficultyFace > 0
        ? row.difficultyFace
        : mapDifficultyFace(row.difficulty) || 10;
    return {
      ...row,
      difficultyFace: face,
    };
  });
}

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function getBigrams(str: string): Set<string> {
  const s = str.toLowerCase();
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function calculateSearchScore(lvl: Record<string, unknown>, rawQ: string): number {
  const qLower = rawQ.toLowerCase().trim();
  const qNorm = removeDiacritics(qLower);
  const qClean = qNorm.replace(/[^a-z0-9]/g, '');
  const qTokens = qNorm.split(/[^a-z0-9]+/).filter(Boolean);

  const name = String(lvl.name || '');
  const nameLower = name.toLowerCase().trim();
  const nameNorm = removeDiacritics(nameLower);
  const nameClean = nameNorm.replace(/[^a-z0-9]/g, '');
  const nameWords = nameNorm.split(/[^a-z0-9]+/).filter(Boolean);

  let score = 0;

  // GD Level ID match
  const qNum = parseInt(qLower, 10);
  if (Number.isFinite(qNum) && qNum > 0 && (lvl.gdLevelId as number | undefined) === qNum) {
    score = Math.max(score, 12000);
  }

  // Exact matches
  if (nameLower === qLower) {
    score = Math.max(score, 10000);
  } else if (nameNorm === qNorm) {
    score = Math.max(score, 9500);
  } else if (qClean.length >= 3 && nameClean === qClean) {
    score = Math.max(score, 9000);
  }

  // Prefix / Word start
  if (nameNorm.startsWith(qNorm)) {
    score = Math.max(score, 7500);
  } else if (nameWords.some((w) => w.startsWith(qNorm))) {
    score = Math.max(score, 6500);
  }

  // Substring matches
  if (nameNorm.includes(qNorm)) {
    score = Math.max(score, 5500);
  } else if (qClean.length >= 3 && nameClean.includes(qClean)) {
    score = Math.max(score, 5000);
  }

  // Token matching (e.g. 'ice diablo' matching 'ICE Carbon Diablo X')
  if (qTokens.length > 1) {
    let matchedCount = 0;
    for (const t of qTokens) {
      if (nameWords.some((w) => w.includes(t)) || nameNorm.includes(t)) {
        matchedCount++;
      }
    }
    if (matchedCount === qTokens.length) {
      score = Math.max(score, 4000 + qTokens.length * 200);
    } else if (matchedCount > 0) {
      score = Math.max(score, Math.round(2000 * (matchedCount / qTokens.length)));
    }
  }

  // Fuzzy similarity (typos, near matches)
  const dice = diceCoefficient(qClean.length >= 2 ? qClean : qNorm, nameClean.length >= 2 ? nameClean : nameNorm);
  if (dice >= 0.4) {
    score = Math.max(score, Math.round(2500 * dice));
  }

  // Creator name match
  const creator = String(lvl.creatorName || '').toLowerCase();
  if (creator.includes(qNorm)) {
    score = Math.max(score, 1500);
  }

  if (score === 0) return 0;

  // Secondary tie-breakers (rank & records)
  let tieBreaker = 0;
  if ((lvl.classicRank as number | null) != null) tieBreaker += 150;
  if ((lvl.placement as number | null) != null) tieBreaker += 100;
  if ((lvl.vnPlacement as number | null) != null) tieBreaker += 100;
  const victorCount = (lvl.victorCount as number | undefined) || 0;
  if (victorCount > 0) tieBreaker += Math.min(50, victorCount * 2);

  return score + tieBreaker;
}

function buildSspWhere(input: {
  challenge: boolean;
  tab: string;
  searching: boolean;
  filterModes: string[];
  filterTiers: string[];
  filterFaces: number[];
  filterVN: boolean;
  filterUnranked: boolean;
  q: string;
  vnRanking: boolean;
}): Prisma.LevelWhereInput {
  const and: Prisma.LevelWhereInput[] = [{ isChallenge: input.challenge }];

  if (input.filterModes.length > 0) {
    and.push({ mode: { in: input.filterModes as LevelMode[] } });
  }
  if (input.filterVN) {
    and.push({ isVN: true });
  }
  if (input.filterFaces && input.filterFaces.length > 0) {
    and.push({ difficultyFace: { in: input.filterFaces } });
  }

  const rankField = input.tab === 'classic' ? 'classicRank' : input.vnRanking ? 'vnPlacement' : 'placement';
  const tierClause = tierFieldWhere(rankField, input.filterTiers);
  if (tierClause) and.push(tierClause);

  // When searching, do NOT restrict by tab/rank rules so all matching levels appear regardless of rank
  if (!input.challenge && !input.searching) {
    if (input.tab === 'classic') {
      and.push({
        mode: LevelMode.CLASSIC,
        isChallenge: false,
        classicRank: { not: null },
      });
    } else if (input.tab === 'featured') {
      and.push({
        isVN: true,
        isChallenge: false,
        OR: [{ vnPlacement: { not: null } }, { difficultyFace: { gte: 10 } }],
      });
    } else if (input.tab === 'demonlist') {
      and.push({
        mode: LevelMode.CLASSIC,
        placement: { gte: 1, lte: 150 },
      });
    } else if (input.tab === 'pemonlist') {
      and.push({
        mode: LevelMode.PLATFORMER,
        placement: { gte: 1, lte: 150 },
      });
    } else if (input.tab === 'vn') {
      and.push({ isVN: true, isChallenge: false });
    }
  }

  if (input.filterUnranked) {
    and.push({
      placement: null,
      classicRank: null,
      records: { some: { status: RecordStatus.APPROVED } },
    });
  }

  if (input.searching && input.q) {
    const rawQ = input.q.trim();
    const unaccentQ = removeDiacritics(rawQ);
    const spacelessQ = rawQ.replace(/[\s\-_]+/g, '');
    const tokens = unaccentQ.split(/[\s\-_]+/).filter((w) => w.length >= 2);

    const or: Prisma.LevelWhereInput[] = [
      { name: { contains: rawQ, mode: 'insensitive' } },
      { creatorName: { contains: rawQ, mode: 'insensitive' } },
    ];
    if (unaccentQ !== rawQ) {
      or.push({ name: { contains: unaccentQ, mode: 'insensitive' } });
      or.push({ creatorName: { contains: unaccentQ, mode: 'insensitive' } });
    }
    if (spacelessQ.length >= 3 && spacelessQ !== rawQ) {
      or.push({ name: { contains: spacelessQ, mode: 'insensitive' } });
    }
    for (const t of tokens) {
      if (t.length >= 3 && t !== rawQ && t !== unaccentQ) {
        or.push({ name: { contains: t, mode: 'insensitive' } });
      }
    }
    const qNum = parseInt(rawQ, 10);
    if (Number.isFinite(qNum) && qNum > 0) {
      or.push({ gdLevelId: qNum });
    }
    and.push({ OR: or });
  }

  return and.length === 1 ? and[0] : { AND: and };
}

async function loadSspLevelsPage(searchParams: URLSearchParams) {
  const tab = searchParams.get('tab') || 'featured';
  const q = (searchParams.get('search') || '').toLowerCase();
  const filterModes = searchParams.get('modes') ? searchParams.get('modes')!.split(',') : [];
  const filterTiers = searchParams.get('tiers') ? searchParams.get('tiers')!.split(',') : [];
  const filterFaces = searchParams.get('faces') ? searchParams.get('faces')!.split(',').map(Number) : [];
  const filterVN = searchParams.get('vn') === '1';
  const filterUnranked = searchParams.get('unranked') === '1';
  const challenge = searchParams.get('challenge') === '1' || tab === 'challenge';

  const searching = Boolean(q);
  const vnRanking = !challenge && (tab === 'vn' || tab === 'featured' || filterVN);
  const classicRanking = !challenge && tab === 'classic';

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

  const where = buildSspWhere({
    challenge,
    tab,
    searching,
    filterModes,
    filterTiers,
    filterFaces,
    filterVN,
    filterUnranked,
    q,
    vnRanking,
  });

  // Fast-path: When not searching, leverage direct PostgreSQL pagination, ordering, and count
  // This drastically reduces memory allocations on VPS 1GB RAM by avoiding loading 2,900+ rows into RAM.
  if (!searching) {
    const orderBy: Prisma.LevelOrderByWithRelationInput[] = challenge
      ? [{ placement: { sort: 'asc', nulls: 'last' } }, { difficultyFace: 'desc' }, { name: 'asc' }]
      : tab === 'vn'
        ? [{ creator: { creatorPoints: 'desc' } }, { creatorName: 'asc' }, { name: 'asc' }]
        : classicRanking
          ? [{ classicRank: { sort: 'asc', nulls: 'last' } }, { difficultyFace: 'desc' }, { name: 'asc' }]
          : vnRanking
            ? [{ vnPlacement: { sort: 'asc', nulls: 'last' } }, { difficultyFace: 'desc' }, { name: 'asc' }]
            : [{ mode: 'asc' }, { placement: { sort: 'asc', nulls: 'last' } }, { difficultyFace: 'desc' }, { name: 'asc' }];

    const [total, rows] = await Promise.all([
      prisma.level.count({ where }),
      prisma.level.findMany({
        where,
        select: dbLevelSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mapped = mapLevelFaces(rows);
    const withCounts = await attachVictorCounts(mapped);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { levels: withCounts, total, totalPages };
  }

  // Search path: capped candidate queries with fuzzy similarity scoring
  let rows = await prisma.level.findMany({
    where,
    select: dbLevelSelect,
    take: 200,
  });

  // If searching and initial exact/token query yielded 0 results, fallback to searching candidates
  if (rows.length === 0) {
    const fallbackWhere: Prisma.LevelWhereInput = {
      isChallenge: challenge,
      ...(filterModes.length > 0 ? { mode: { in: filterModes as LevelMode[] } } : {}),
      ...(filterVN ? { isVN: true } : {}),
    };
    rows = await prisma.level.findMany({
      where: fallbackWhere,
      select: dbLevelSelect,
      take: 200,
    });
  }

  let candidates: (DbLevelRow & { _searchScore?: number })[] = rows
    .map((lvl) => {
      const score = calculateSearchScore(lvl, q);
      return { ...lvl, _searchScore: score };
    })
    .filter((lvl) => (lvl._searchScore ?? 0) > 0);

  let mapped = mapLevelFaces(candidates);
  mapped = await attachVictorCounts(mapped);
  let enriched = mapped;

  let filtered = enriched.filter((lvl: Record<string, unknown>) => {
    const tierRank = classicRanking
      ? (lvl.classicRank as number | null)
      : vnRanking ? (lvl.vnPlacement as number | null) : (lvl.placement as number | null);
    if (!placementMatchesTiers(tierRank, filterTiers)) return false;

    const face = (lvl.difficultyFace as number | null) ?? 10;
    if (!matchesDifficultyFilter(face, filterFaces)) return false;

    if (filterUnranked) {
      if ((lvl.classicRank as number | null) !== null) return false;
      if ((lvl.placement as number | null) !== null) return false;
      if (!lvl.victorCount || lvl.victorCount === 0) return false;
    }

    return true;
  });

  filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const scoreA = (a._searchScore as number) || 0;
    const scoreB = (b._searchScore as number) || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    if (classicRanking) {
      const aRank = (a.classicRank as number | null) ?? 999999;
      const bRank = (b.classicRank as number | null) ?? 999999;
      if (aRank !== bRank) return aRank - bRank;
    }
    const aPlace = (a.placement as number | null) ?? 999999;
    const bPlace = (b.placement as number | null) ?? 999999;
    if (aPlace !== bPlace) return aPlace - bPlace;
    const aVic = (a.victorCount as number | null) ?? 0;
    const bVic = (b.victorCount as number | null) ?? 0;
    if (aVic !== bVic) return bVic - aVic;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sliced = filtered.slice((page - 1) * limit, page * limit);

  return { levels: sliced, total, totalPages };
}

async function loadDbLevels(mode: string, tier: string | null, challenge: boolean, skip: number, take: number) {
  const levels = await prisma.level.findMany({
    where: {
      isChallenge: challenge,
      ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      ...(tier === 'main'
        ? { placement: { gte: 1, lte: 75 } }
        : tier === 'extended'
          ? { placement: { gte: 76, lte: 150 } }
          : tier === 'legacy'
            ? { OR: [{ placement: { gte: 151 } }, { placement: null }] }
            : {}),
    },
    select: dbLevelSelect,
    skip,
    take,
    orderBy: { placement: 'asc' },
  });

  const withCounts = await attachVictorCounts(mapLevelFaces(levels));
  return withCounts.sort(compareListLevels);
}

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const ssp = searchParams.get('ssp') === '1';

    if (ssp) {
      const result = await cachedJson(
        () => loadSspLevelsPage(searchParams),
        [
          'levels-ssp',
          searchParams.get('tab') || 'featured',
          searchParams.get('challenge') || '0',
          searchParams.get('page') || '1',
          searchParams.get('limit') || '20',
          searchParams.get('search') || '',
          searchParams.get('modes') || '',
          searchParams.get('tiers') || '',
          searchParams.get('faces') || '',
          searchParams.get('vn') || '0',
          searchParams.get('unranked') || '0',
        ],
        [CACHE_TAGS.levels],
        180
      );

      return NextResponse.json(
        { success: true, levels: result.levels, total: result.total, totalPages: result.totalPages },
        { headers: PUBLIC_CACHE_HEADERS }
      );
    }

    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier') || '';
    const challenge = searchParams.get('challenge') === '1' || searchParams.get('tab') === 'challenge';
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(5000, Math.max(1, parseInt(searchParams.get('take') || '5000', 10) || 5000));
    const levels = await cachedJson(
      () => loadDbLevels(mode, tier || null, challenge, skip, take),
      ['levels', mode, tier || 'all', challenge ? '1' : '0', String(skip), String(take)],
      [CACHE_TAGS.levels],
      180
    );

    return NextResponse.json(
      { success: true, levels, source: 'database' },
      { headers: PUBLIC_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    return publicApiError(error, 'Lỗi truy xuất Levels List.');
  }
}
