import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { pickDecoAndLayoutBadges } from '@/lib/creatorPoints';
import { pickHardestLevel } from '@/lib/recordUtils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC'; // CLASSIC, PLATFORMER, CREATOR

    if (mode === 'CREATOR') {
      const creators = await prisma.user.findMany({
        where: { creatorPoints: { gt: 0 } },
        orderBy: { creatorPoints: 'desc' },
        take: 100,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          creatorPoints: true,
          role: true,
          country: true,
          supporterUntil: true,
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
      return NextResponse.json({
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
      });
    }

    const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
    const players = await prisma.user.findMany({
      where: mode === 'PLATFORMER' ? { platformerPp: { gt: 0 } } : { classicPp: { gt: 0 } },
      orderBy: mode === 'PLATFORMER' ? { platformerPp: 'desc' } : { classicPp: 'desc' },
      take: 100,
      include: {
        records: {
          where: {
            status: RecordStatus.APPROVED,
            level: { mode: levelMode, isChallenge: false },
          },
          include: { level: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      leaderboard: players.map((player) => {
        const { records, ...rest } = player;
        return {
          ...rest,
          hardestLevel: pickHardestLevel(records),
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Bảng Xếp Hạng.' }, { status: 500 });
  }
}
