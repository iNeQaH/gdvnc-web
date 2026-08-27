import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import { getPlayerLeaderboard, playerDisplayName } from '@/lib/leaderboard';

export async function GET() {
  try {
    const [topClassicLevel, topPlatformerLevel, classicBoard, topCreator] = await Promise.all([
      prisma.level.findFirst({
        where: { mode: LevelMode.CLASSIC, isChallenge: false, placement: { not: null } },
        orderBy: { placement: 'asc' },
        select: { id: true, gdLevelId: true, name: true, placement: true, basePp: true, mode: true },
      }),
      prisma.level.findFirst({
        where: { mode: LevelMode.PLATFORMER, isChallenge: false, placement: { not: null } },
        orderBy: { placement: 'asc' },
        select: { id: true, gdLevelId: true, name: true, placement: true, basePp: true, mode: true },
      }),
      getPlayerLeaderboard('CLASSIC'),
      prisma.user.findFirst({
        where: { creatorPoints: { gt: 0 } },
        orderBy: { creatorPoints: 'desc' },
        select: { id: true, username: true, gdUsername: true, avatarUrl: true, creatorPoints: true },
      }),
    ]);

    const top = classicBoard[0];
    const topPlayer = top
      ? {
          id: top.id,
          username: top.username,
          gdUsername: top.gdUsername,
          displayName: playerDisplayName(top),
          avatarUrl: top.avatarUrl,
          classicPp: top.classicPp,
          isLegacy: top.isLegacy,
        }
      : null;

    return NextResponse.json({
      success: true,
      highlights: {
        topClassicLevel,
        topPlatformerLevel,
        topPlayer,
        topCreator: topCreator
          ? {
              ...topCreator,
              displayName: playerDisplayName(topCreator),
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Top 1.' }, { status: 500 });
  }
}
