import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { compareListLevels } from '@/lib/levelSort';
import { applyGdlisthubRanksToLevels } from '@/lib/gdlisthubLists';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';
import { mapDifficultyFace } from '@/lib/gdDifficulty';

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

async function loadDbLevels(mode: string, tier: string | null, challenge: boolean, skip: number, take: number) {
  const levels = await prisma.level.findMany({
    where: {
      isChallenge: challenge,
      ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      ...(tier === 'main' ? { placement: { gte: 1, lte: 75 } }
        : tier === 'extended' ? { placement: { gte: 76, lte: 150 } }
        : tier === 'legacy' ? { OR: [{ placement: { gte: 151 } }, { placement: null }] }
        : {}),
    },
    select: dbLevelSelect,
    skip,
    take,
    orderBy: { placement: 'asc' },
  });

  const ids = levels.map((row) => row.id);
  const counts = ids.length
    ? await prisma.record.groupBy({
        by: ['levelId'],
        where: { status: RecordStatus.APPROVED, levelId: { in: ids } },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(counts.map((row) => [row.levelId, row._count._all]));
  const mapped = levels.map((row) => {
    const face = (row.difficultyFace && row.difficultyFace > 0)
      ? row.difficultyFace
      : (mapDifficultyFace(row.difficulty) || 10);
    return {
      ...row,
      difficultyFace: face,
      victorCount: countMap.get(row.id) || 0,
    };
  });
  if (challenge) return mapped.sort(compareListLevels);
  return applyGdlisthubRanksToLevels(mapped).sort(compareListLevels);
}

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
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

    const ssp = searchParams.get('ssp') === '1';
    if (ssp) {
      const tab = searchParams.get('tab') || 'featured';
      const q = (searchParams.get('search') || '').toLowerCase();
      const filterModes = searchParams.get('modes') ? searchParams.get('modes')!.split(',') : [];
      const filterTiers = searchParams.get('tiers') ? searchParams.get('tiers')!.split(',') : [];
      const filterFaces = searchParams.get('faces') ? searchParams.get('faces')!.split(',').map(Number) : [];
      const filterVN = searchParams.get('vn') === '1';

      const searching = Boolean(q);
      const vnRanking = !challenge && (tab === 'vn' || tab === 'featured' || filterVN);
      const classicRanking = !challenge && tab === 'classic';

      const { placementMatchesTiers, compareVnListLevels } = require('@/lib/levelSort');
      const { isDemonDifficultyFace, matchesDifficultyFilter } = require('@/lib/gdDifficulty');

      let filtered = levels.filter((lvl: any) => {
        if (filterModes.length > 0 && !filterModes.includes(lvl.mode)) return false;

        const tierRank = classicRanking ? lvl.classicPlacement : vnRanking ? lvl.vnPlacement : lvl.placement;
        if (!placementMatchesTiers(tierRank, filterTiers)) return false;

        if (!matchesDifficultyFilter(lvl.difficultyFace ?? 10, filterFaces)) return false;
        if (filterVN && !lvl.isVN) return false;

        if (!challenge && !searching) {
          if (tab === 'featured') {
            if (!lvl.isVN) return false;
            if (!lvl.vnPlacement && !isDemonDifficultyFace(lvl.difficultyFace ?? 0)) return false;
          } else if (tab === 'classic') {
            if (lvl.mode !== 'CLASSIC' || lvl.isChallenge || !lvl.classicPlacement) return false;
          } else if (tab === 'demonlist') {
            if (lvl.mode !== 'CLASSIC' || !lvl.placement || lvl.placement > 150) return false;
          } else if (tab === 'pemonlist') {
            if (lvl.mode !== 'PLATFORMER' || !lvl.placement || lvl.placement > 150) return false;
          } else if (tab === 'vn') {
            if (!lvl.isVN || lvl.isChallenge) return false;
          }
        }

        if (searching) {
          const matchName = lvl.name?.toLowerCase().includes(q);
          const matchCreator = lvl.creatorName?.toLowerCase().includes(q);
          const matchId = String(lvl.gdLevelId || '').includes(q);
          if (!matchName && !matchCreator && !matchId) return false;
        }

        return true;
      });

      filtered.sort((a: any, b: any) => {
        if (!challenge && tab === 'vn') {
          const cpA = a.creator?.creatorPoints || 0;
          const cpB = b.creator?.creatorPoints || 0;
          if (cpA !== cpB) return cpB - cpA;
          return (a.creatorName || '').localeCompare(b.creatorName || '');
        }
        if (classicRanking) {
          return compareListLevels(
            { placement: a.classicPlacement, difficultyFace: a.difficultyFace, name: a.name },
            { placement: b.classicPlacement, difficultyFace: b.difficultyFace, name: b.name }
          );
        }
        if (vnRanking) return compareVnListLevels(a, b);
        const am = String(a.mode || '');
        const bm = String(b.mode || '');
        if (am !== bm) return am === 'CLASSIC' ? -1 : 1;
        return compareListLevels(a, b);
      });

      const page = parseInt(searchParams.get('page') || '1', 10) || 1;
      const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const sliced = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json(
        { success: true, levels: sliced, total, totalPages },
        { headers: PUBLIC_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, levels, source: 'database' },
      { headers: PUBLIC_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
