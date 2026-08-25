import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { pickDecoAndLayoutBadges } from '@/lib/creatorPoints';

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

    if (mode === 'PLATFORMER') {
      const players = await prisma.user.findMany({
        where: { platformerPp: { gt: 0 } },
        orderBy: { platformerPp: 'desc' },
        take: 100,
        include: {
          records: {
            where: {
              status: RecordStatus.APPROVED,
              level: { mode: LevelMode.PLATFORMER },
            },
            include: { level: true },
            orderBy: { timeMs: 'asc' },
            take: 1,
          },
        },
      });
      return NextResponse.json({ success: true, leaderboard: players });
    }

    // Default: CLASSIC PP
    const players = await prisma.user.findMany({
      where: { classicPp: { gt: 0 } },
      orderBy: { classicPp: 'desc' },
      take: 100,
      include: {
        records: {
          where: {
            status: RecordStatus.APPROVED,
            level: { mode: LevelMode.CLASSIC },
          },
          include: { level: true },
          orderBy: { level: { placement: 'asc' } },
          take: 1,
        },
      },
    });

    return NextResponse.json({ success: true, leaderboard: players });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Bảng Xếp Hạng.' }, { status: 500 });
  }
}
