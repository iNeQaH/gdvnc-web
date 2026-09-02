import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import { getCreatorLeaderboard, getPlayerLeaderboard, playerDisplayName } from '@/lib/leaderboard';
import { GDLISTHUB_CLASSIC, GDLISTHUB_FEATURED, isMissingLevelText } from '@/lib/gdlisthubLists';

const highlightSelect = {
  id: true,
  gdLevelId: true,
  name: true,
  creatorName: true,
  placement: true,
  vnPlacement: true,
  basePp: true,
  mode: true,
} as const;

function withHubCreator<T extends { gdLevelId: number; creatorName: string | null }>(level: T | null): T | null {
  if (!level || !isMissingLevelText(level.creatorName)) return level;
  const hub =
    GDLISTHUB_FEATURED.items.find((it) => it.gdLevelId === level.gdLevelId) ||
    GDLISTHUB_CLASSIC.items.find((it) => it.gdLevelId === level.gdLevelId);
  if (!hub?.creator) return level;
  return { ...level, creatorName: hub.creator };
}

function hubFeaturedTop(mode: 'CLASSIC' | 'PLATFORMER') {
  const wantPlat = mode === 'PLATFORMER';
  const item = GDLISTHUB_FEATURED.items.find((it) => Boolean(it.isPlatformer) === wantPlat);
  if (!item) return null;
  return {
    id: `gdlh:${item.gdLevelId}`,
    gdLevelId: item.gdLevelId,
    name: item.name,
    creatorName: item.creator,
    placement: item.position,
    vnPlacement: item.position,
    basePp: 0,
    mode,
  };
}

export async function GET() {
  try {
    const [dbClassic, dbPlatformer, classicBoard, creatorBoard] = await Promise.all([
      prisma.level.findFirst({
        where: { isVN: true, isChallenge: false, mode: LevelMode.CLASSIC, vnPlacement: { not: null } },
        orderBy: { vnPlacement: 'asc' },
        select: highlightSelect,
      }),
      prisma.level.findFirst({
        where: { isVN: true, isChallenge: false, mode: LevelMode.PLATFORMER },
        orderBy: [{ vnPlacement: 'asc' }, { placement: 'asc' }, { name: 'asc' }],
        select: highlightSelect,
      }),
      getPlayerLeaderboard('CLASSIC'),
      getCreatorLeaderboard(),
    ]);

    const topClassicLevel = withHubCreator(dbClassic) || hubFeaturedTop('CLASSIC');
    const topPlatformerLevel = withHubCreator(dbPlatformer) || hubFeaturedTop('PLATFORMER');
    const topCreatorUser = creatorBoard[0] || null;

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
        topCreator: topCreatorUser
          ? {
              id: topCreatorUser.id,
              username: topCreatorUser.username,
              gdUsername: topCreatorUser.gdUsername,
              avatarUrl: topCreatorUser.avatarUrl,
              creatorPoints: topCreatorUser.creatorPoints,
              displayName: playerDisplayName(topCreatorUser),
              isLegacy: topCreatorUser.isLegacy,
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Top 1.' }, { status: 500 });
  }
}
