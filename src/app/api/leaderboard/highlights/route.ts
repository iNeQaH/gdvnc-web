import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';

export async function GET() {
  try {
    const [topClassicLevel, topPlatformerLevel, topPlayer, topCreator] = await Promise.all([
      prisma.level.findFirst({
        where: { mode: LevelMode.CLASSIC, placement: { not: null } },
        orderBy: { placement: 'asc' },
        select: { id: true, name: true, placement: true, basePp: true, mode: true },
      }),
      prisma.level.findFirst({
        where: { mode: LevelMode.PLATFORMER, placement: { not: null } },
        orderBy: { placement: 'asc' },
        select: { id: true, name: true, placement: true, basePp: true, mode: true },
      }),
      prisma.user.findFirst({
        where: { classicPp: { gt: 0 } },
        orderBy: { classicPp: 'desc' },
        select: { id: true, username: true, avatarUrl: true, classicPp: true },
      }),
      prisma.user.findFirst({
        where: { creatorPoints: { gt: 0 } },
        orderBy: { creatorPoints: 'desc' },
        select: { id: true, username: true, avatarUrl: true, creatorPoints: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      highlights: {
        topClassicLevel,
        topPlatformerLevel,
        topPlayer,
        topCreator,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Top 1.' }, { status: 500 });
  }
}
