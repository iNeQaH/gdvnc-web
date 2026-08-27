import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { pickDecoAndLayoutBadges } from '@/lib/creatorPoints';
import { pickHardestLevel } from '@/lib/recordUtils';

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; body: unknown }>();

const publicUser = {
  id: true,
  username: true,
  avatarUrl: true,
  role: true,
  country: true,
  supporterUntil: true,
} as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const cached = cache.get(mode);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json(cached.body, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    if (mode === 'CREATOR') {
      const creators = await prisma.user.findMany({
        where: { creatorPoints: { gt: 0 } },
        orderBy: { creatorPoints: 'desc' },
        take: 100,
        select: {
          ...publicUser,
          creatorPoints: true,
          createdLevels: {
            select: { name: true, difficulty: true },
          },
          userBadges: {
            include: {
              badge: { include: { badgeCategory: true } },
            },
          },
        },
      });
      const body = {
        success: true,
        leaderboard: creators.map((creator) => {
          const { userBadges, ...rest } = creator;
          return {
            ...rest,
            qualityBadges: pickDecoAndLayoutBadges(
              userBadges.map((ub) => ({
                ...ub.badge,
                badgeCategory: ub.badge.badgeCategory,
              }))
            ),
          };
        }),
      };
      cache.set(mode, { at: Date.now(), body });
      return NextResponse.json(body, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
    const ppField = mode === 'PLATFORMER' ? 'platformerPp' : 'classicPp';
    const players = await prisma.user.findMany({
      where: { [ppField]: { gt: 0 } },
      orderBy: { [ppField]: 'desc' },
      take: 100,
      select: {
        ...publicUser,
        classicPp: true,
        platformerPp: true,
        records: {
          where: {
            status: RecordStatus.APPROVED,
            level: { mode: levelMode, isChallenge: false },
          },
          select: {
            progress: true,
            timeMs: true,
            level: {
              select: {
                mode: true,
                minPercent: true,
                placement: true,
                name: true,
                gdLevelId: true,
                isChallenge: true,
              },
            },
          },
        },
      },
    });

    const body = {
      success: true,
      leaderboard: players.map((player) => {
        const { records, ...rest } = player;
        return {
          ...rest,
          hardestLevel: pickHardestLevel(records),
        };
      }),
    };
    cache.set(mode, { at: Date.now(), body });
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Bảng Xếp Hạng.' }, { status: 500 });
  }
}
