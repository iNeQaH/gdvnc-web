import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { compareListLevels } from '@/lib/levelSort';
import { applyGdlisthubRanksToLevels } from '@/lib/gdlisthubLists';
import { checkSiteLockAndBlock } from '@/lib/siteLock';

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
  _count: { select: { records: { where: { status: RecordStatus.APPROVED } } } },
} as const;

function mapDbLevels(levels: Array<any>) {
  return levels.map(({ _count, ...rest }) => ({ ...rest, victorCount: _count.records }));
}

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
  const mapped = mapDbLevels(levels);
  if (challenge) return mapped.sort(compareListLevels);
  return applyGdlisthubRanksToLevels(mapped).sort(compareListLevels);
}

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier');
    const challenge = searchParams.get('challenge') === '1';
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10) || 0);
    const take = Math.min(1000, Math.max(1, parseInt(searchParams.get('take') || '800', 10) || 800));
    const levels = await loadDbLevels(mode, tier, challenge, skip, take);
    return NextResponse.json(
      { success: true, levels, source: 'database' },
      { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
