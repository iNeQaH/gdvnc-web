import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import {
  getExternalList,
  mergeExternalWithDb,
  syncExternalListToDb,
} from '@/lib/externalLists';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier');
    const challenge = searchParams.get('challenge') === '1';

    if (challenge) {
      let placementWhere: any = {};
      if (tier === 'main') placementWhere = { gte: 1, lte: 75 };
      else if (tier === 'extended') placementWhere = { gte: 76, lte: 500 };
      else if (tier === 'legacy') placementWhere = { gt: 500 };

      const levels = await prisma.level.findMany({
        where: {
          isChallenge: true,
          ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
          ...(tier ? { placement: placementWhere } : {}),
        },
        orderBy: { placement: { sort: 'asc', nulls: 'last' } },
        select: {
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
          basePp: true,
          minPercent: true,
          creatorName: true,
          youtubeId: true,
          description: true,
          _count: { select: { records: { where: { status: RecordStatus.APPROVED } } } },
        },
      });

      return NextResponse.json(
        {
          success: true,
          levels: levels.map(({ _count, ...rest }) => ({ ...rest, victorCount: _count.records })),
          source: 'database',
        },
        { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
      );
    }

    const modes: Array<'CLASSIC' | 'PLATFORMER'> =
      mode === 'PLATFORMER' ? ['PLATFORMER'] : mode === 'CLASSIC' ? ['CLASSIC'] : ['CLASSIC', 'PLATFORMER'];

    const externalLists = await Promise.all(
      modes.map(async (m) => {
        try {
          return await getExternalList(m);
        } catch (e) {
          console.error(`external list ${m} failed`, e);
          return [];
        }
      })
    );

    const dbLevels = await prisma.level.findMany({
      where: {
        isChallenge: false,
        ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
      },
      select: {
        id: true,
        gdLevelId: true,
        difficulty: true,
        difficultyFace: true,
        ratingType: true,
        isVN: true,
        isChallenge: true,
        description: true,
        _count: { select: { records: { where: { status: RecordStatus.APPROVED } } } },
      },
    });

    const dbByGd = new Map(
      dbLevels.map((l) => [
        l.gdLevelId,
        {
          id: l.id,
          gdLevelId: l.gdLevelId,
          difficulty: l.difficulty,
          difficultyFace: l.difficultyFace,
          ratingType: l.ratingType,
          isVN: l.isVN,
          isChallenge: l.isChallenge,
          description: l.description,
          victorCount: l._count.records,
        },
      ])
    );

    let levels = externalLists.flatMap((list) => mergeExternalWithDb(list, dbByGd));

    if (tier === 'main') levels = levels.filter((l) => l.placement >= 1 && l.placement <= 75);
    else if (tier === 'extended') levels = levels.filter((l) => l.placement >= 76 && l.placement <= 500);
    else if (tier === 'legacy') levels = levels.filter((l) => l.placement > 500);

    levels.sort((a, b) => {
      if (a.mode !== b.mode) return a.mode === 'CLASSIC' ? -1 : 1;
      return a.placement - b.placement;
    });

    // Keep local ratings/records in sync with live ranks (non-blocking)
    for (const m of modes) {
      void syncExternalListToDb(m).catch((err) => console.error(`sync ${m}`, err));
    }

    return NextResponse.json(
      { success: true, levels, source: 'external' },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
