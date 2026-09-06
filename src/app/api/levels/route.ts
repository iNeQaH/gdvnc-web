import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { compareListLevels } from '@/lib/levelSort';
import { applyGdlisthubRanksToLevels } from '@/lib/gdlisthubLists';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

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
  const mapped = levels.map((row) => ({ ...row, victorCount: countMap.get(row.id) || 0 }));
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
    const challenge = searchParams.get('challenge') === '1';
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(1000, Math.max(1, parseInt(searchParams.get('take') || '800', 10) || 800));
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
