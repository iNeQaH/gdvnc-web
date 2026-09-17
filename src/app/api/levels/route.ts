import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, Prisma, RecordStatus } from '@prisma/client';
import {
  compareListLevels,
  compareVnListLevels,
  placementMatchesTiers,
} from '@/lib/levelSort';
import { applyGdlisthubRanksToLevels } from '@/lib/gdlisthubLists';
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
  field: 'placement' | 'vnPlacement',
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

function buildSspWhere(input: {
  challenge: boolean;
  tab: string;
  searching: boolean;
  filterModes: string[];
  filterTiers: string[];
  filterVN: boolean;
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

  const rankField = input.vnRanking ? 'vnPlacement' : 'placement';
  const tierClause = tierFieldWhere(rankField, input.filterTiers);
  if (tierClause) and.push(tierClause);

  if (!input.challenge && !input.searching) {
    if (input.tab === 'featured') {
      and.push({
        isVN: true,
        isChallenge: false,
        OR: [{ vnPlacement: { not: null } }, { difficultyFace: { gte: 10 } }],
      });
    } else if (input.tab === 'classic') {
      and.push({
        mode: LevelMode.CLASSIC,
        isChallenge: false,
        records: { some: { status: RecordStatus.APPROVED } },
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

  if (input.searching && input.q) {
    const qNum = parseInt(input.q, 10);
    const or: Prisma.LevelWhereInput[] = [
      { name: { contains: input.q, mode: 'insensitive' } },
      { creatorName: { contains: input.q, mode: 'insensitive' } },
    ];
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
    filterVN,
    q,
    vnRanking,
  });

  const rows = await prisma.level.findMany({
    where,
    select: dbLevelSelect,
  });

  let mapped = mapLevelFaces(rows);
  mapped = await attachVictorCounts(mapped);
  let enriched = applyGdlisthubRanksToLevels(mapped, undefined, undefined, {
    addMissingVirtual: false,
  });

  let filtered = enriched.filter((lvl: Record<string, unknown>) => {
    const tierRank = vnRanking ? (lvl.vnPlacement as number | null) : (lvl.placement as number | null);
    if (!placementMatchesTiers(tierRank, filterTiers)) return false;

    const face = (lvl.difficultyFace as number | null) ?? 10;
    if (!matchesDifficultyFilter(face, filterFaces)) return false;

    if (!challenge && !searching) {
      if (tab === 'featured') {
        if (!lvl.isVN) return false;
        if (!lvl.vnPlacement && !isDemonDifficultyFace(face)) return false;
      } else if (tab === 'classic') {
        if (lvl.mode !== 'CLASSIC' || lvl.isChallenge || !(lvl.victorCount as number)) return false;
      } else if (tab === 'demonlist') {
        if (lvl.mode !== 'CLASSIC' || !lvl.placement || (lvl.placement as number) > 150) return false;
      } else if (tab === 'pemonlist') {
        if (lvl.mode !== 'PLATFORMER' || !lvl.placement || (lvl.placement as number) > 150) return false;
      } else if (tab === 'vn') {
        if (!lvl.isVN || lvl.isChallenge) return false;
      }
    }

    return true;
  });

  filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    if (!challenge && tab === 'vn') {
      const cpA = (a.creator as { creatorPoints?: number } | null)?.creatorPoints || 0;
      const cpB = (b.creator as { creatorPoints?: number } | null)?.creatorPoints || 0;
      if (cpA !== cpB) return cpB - cpA;
      return String(a.creatorName || '').localeCompare(String(b.creatorName || ''));
    }
    if (classicRanking) {
      return compareListLevels(
        { placement: a.placement as number | null, difficultyFace: a.difficultyFace as number, name: a.name as string },
        { placement: b.placement as number | null, difficultyFace: b.difficultyFace as number, name: b.name as string }
      );
    }
    if (vnRanking) return compareVnListLevels(a, b);
    const am = String(a.mode || '');
    const bm = String(b.mode || '');
    if (am !== bm) return am === 'CLASSIC' ? -1 : 1;
    return compareListLevels(a, b);
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
  if (challenge) return withCounts.sort(compareListLevels);
  return applyGdlisthubRanksToLevels(withCounts).sort(compareListLevels);
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
