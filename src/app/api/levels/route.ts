import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier');
    const challenge = searchParams.get('challenge') === '1';

    let placementWhere: any = {};
    if (tier === 'main') {
      placementWhere = { gte: 1, lte: 75 };
    } else if (tier === 'extended') {
      placementWhere = { gte: 76, lte: 150 };
    } else if (tier === 'legacy') {
      placementWhere = { gt: 150 };
    }

    const levels = await prisma.level.findMany({
      where: {
        isChallenge: challenge,
        ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
        ...(tier ? { placement: placementWhere } : {}),
      },
      orderBy: {
        placement: { sort: 'asc', nulls: 'last' },
      },
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
        _count: {
          select: {
            records: { where: { status: RecordStatus.APPROVED } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        levels: levels.map((lvl) => {
          const { _count, ...rest } = lvl;
          return { ...rest, victorCount: _count.records };
        }),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
