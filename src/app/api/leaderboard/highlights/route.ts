import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import { playerDisplayName } from '@/lib/leaderboard';
import { GDLISTHUB_CLASSIC, GDLISTHUB_FEATURED, isMissingLevelText } from '@/lib/gdlisthubLists';
import { publicApiError } from '@/lib/apiError';

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

const userHighlightSelect = {
  id: true,
  username: true,
  gdUsername: true,
  avatarUrl: true,
  classicPp: true,
  creatorPoints: true,
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
    const [dbClassic, dbPlatformer, topPlayerRow, topCreatorRow] = await Promise.all([
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
      prisma.user.findFirst({
        where: { classicPp: { gt: 0 } },
        orderBy: { classicPp: 'desc' },
        select: userHighlightSelect,
      }),
      prisma.user.findFirst({
        where: { creatorPoints: { gt: 0 } },
        orderBy: { creatorPoints: 'desc' },
        select: userHighlightSelect,
      }),
    ]);

    const topClassicLevel = withHubCreator(dbClassic) || hubFeaturedTop('CLASSIC');
    const topPlatformerLevel = withHubCreator(dbPlatformer) || hubFeaturedTop('PLATFORMER');

    const topPlayer = topPlayerRow
      ? {
          id: topPlayerRow.id,
          username: topPlayerRow.username,
          gdUsername: topPlayerRow.gdUsername,
          displayName: playerDisplayName(topPlayerRow),
          avatarUrl: topPlayerRow.avatarUrl,
          classicPp: topPlayerRow.classicPp,
          isLegacy: false,
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        highlights: {
          topClassicLevel,
          topPlatformerLevel,
          topPlayer,
          topCreator: topCreatorRow
            ? {
                id: topCreatorRow.id,
                username: topCreatorRow.username,
                gdUsername: topCreatorRow.gdUsername,
                avatarUrl: topCreatorRow.avatarUrl,
                creatorPoints: topCreatorRow.creatorPoints,
                displayName: playerDisplayName(topCreatorRow),
                isLegacy: false,
              }
            : null,
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    return publicApiError(error, 'Lỗi tải Top 1.');
  }
}
