import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const tier = searchParams.get('tier'); // 'main' (1-75), 'extended' (76-150), 'legacy' (151+)

    let placementWhere: any = {};
    if (tier === 'main') {
      placementWhere = { gte: 1, lte: 75 };
    } else if (tier === 'extended') {
      placementWhere = { gte: 76, lte: 150 };
    } else if (tier === 'legacy') {
      placementWhere = { gt: 150 };
    }

    const challenge = searchParams.get('challenge') === '1';

    const levels = await prisma.level.findMany({
      where: {
        isChallenge: challenge,
        ...(mode !== 'ALL' ? { mode: mode as LevelMode } : {}),
        ...(tier ? { placement: placementWhere } : {}),
      },
      orderBy: {
        placement: 'asc',
      },
      include: {
        records: {
          where: { status: RecordStatus.APPROVED },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                classicPp: true,
                platformerPp: true,
              },
            },
          },
          orderBy: mode === LevelMode.PLATFORMER ? { timeMs: 'asc' } : { submittedAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, levels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất Levels List.' }, { status: 500 });
  }
}
