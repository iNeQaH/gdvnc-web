import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { awardedPpForProgress, getWeightedPpBreakdown } from '@/lib/ScoringEngine';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/lib/recordUtils';
import { requireAuth } from '@/lib/auth';
import { clipText } from '@/lib/validate';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        supporterUntil: true,
        discordTag: true,
        gdUsername: true,
        country: true,
        classicPp: true,
        platformerPp: true,
        creatorPoints: true,
        records: {
          where: { status: RecordStatus.APPROVED },
          include: {
            level: true,
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
        createdLevels: {
          select: {
            id: true,
            gdLevelId: true,
            name: true,
            mode: true,
            placement: true,
            basePp: true,
            difficulty: true,
            ratingType: true,
            youtubeId: true,
          },
        },
        creatorWorks: {
          where: { status: RecordStatus.APPROVED },
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            levelName: true,
            gdLevelId: true,
            submittedAt: true,
            badgeGranted: true,
            cpGranted: true,
          },
        },
        userBadges: {
          include: {
            badge: { include: { badgeCategory: true } },
          }
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    const dedupedRecords = dedupeRecordsByLevel(user.records);

    const classicRecords = dedupedRecords
      .filter((r) => r.level.mode === LevelMode.CLASSIC)
      .map((r) => ({
        name: r.level.name,
        gdLevelId: r.level.gdLevelId,
        placement: r.level.placement,
        basePp: r.level.basePp,
        minPercent: r.level.minPercent,
        progress: r.progress,
        awardedPp: awardedPpForProgress(r.progress, r.level.minPercent, r.level.basePp),
        qualifiesForPp: isQualifyingClassicRecord(r, r.level),
        recordId: r.id,
        videoUrl: r.videoUrl,
        hz: r.hz,
        device: r.device,
        submittedAt: r.submittedAt,
      }));

    classicRecords.sort((a, b) => {
      const pa = a.placement ?? Number.POSITIVE_INFINITY;
      const pb = b.placement ?? Number.POSITIVE_INFINITY;
      return pa - pb || b.basePp - a.basePp;
    });

    const classicForPp = classicRecords.filter((r) => r.qualifiesForPp);
    const classicBreakdown = getWeightedPpBreakdown(classicForPp);

    const platformerCompletions = dedupedRecords
      .filter((r) => r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
      .map((r) => ({
        name: r.level.name,
        gdLevelId: r.level.gdLevelId,
        placement: r.level.placement,
        basePp: r.level.basePp,
        timeMs: r.timeMs,
        recordId: r.id,
        videoUrl: r.videoUrl,
        hz: r.hz,
        device: r.device,
        submittedAt: r.submittedAt,
      }))
      .sort((a, b) => {
        const pa = a.placement ?? Number.POSITIVE_INFINITY;
        const pb = b.placement ?? Number.POSITIVE_INFINITY;
        return pa - pb || b.basePp - a.basePp;
      });

    let hardestClassic = null;
    let hardestPlatformer = null;
    if (classicForPp.length > 0) {
      hardestClassic = [...classicForPp].sort(
        (a, b) => (a.placement ?? Number.POSITIVE_INFINITY) - (b.placement ?? Number.POSITIVE_INFINITY)
      )[0];
    }
    if (platformerCompletions.length > 0) {
      hardestPlatformer = [...platformerCompletions].sort(
        (a, b) => (a.placement ?? Number.POSITIVE_INFINITY) - (b.placement ?? Number.POSITIVE_INFINITY)
      )[0];
    }

    // Calculate National Ranks
    const allClassicRanks = await prisma.user.count({
      where: { classicPp: { gt: user.classicPp } },
    });
    const classicRank = allClassicRanks + 1;

    const allPlatformerRanks = await prisma.user.count({
      where: { platformerPp: { gt: user.platformerPp } },
    });
    const platformerRank = allPlatformerRanks + 1;

    const allCreatorRanks = await prisma.user.count({
      where: { creatorPoints: { gt: user.creatorPoints } },
    });
    const creatorRank = allCreatorRanks + 1;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        supporterUntil: user.supporterUntil,
        discordTag: user.discordTag,
        gdUsername: user.gdUsername,
        country: user.country,
        classicPp: user.classicPp,
        platformerPp: user.platformerPp,
        creatorPoints: user.creatorPoints,
        classicRank,
        platformerRank,
        creatorRank,
        hardestClassic,
        hardestPlatformer,
        classicBreakdown,
        classicRecords,
        platformerCompletions,
        createdLevels: user.createdLevels,
        creatorWorks: user.creatorWorks,
        totalRecordsCount: dedupedRecords.length,
        badges: user.userBadges
          .slice()
          .sort((a: any, b: any) => (a.badge.sortOrder ?? 0) - (b.badge.sortOrder ?? 0))
          .map((ub: any) => ub.badge),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi truy vấn thông tin người chơi.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const auth = await requireAuth();
    const { username } = await params;
    const body = await req.json();

    const isSelf = auth.username === username;
    const isAdmin = auth.role === 'ADMIN';
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Không có quyền sửa profile này' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { username },
      data: {
        bio: body.bio !== undefined ? clipText(body.bio, 2000) : undefined,
        avatarUrl: body.avatarUrl !== undefined ? clipText(body.avatarUrl, 400) : undefined,
        coverUrl: body.coverUrl !== undefined ? clipText(body.coverUrl, 400) : undefined,
        country: body.country !== undefined ? clipText(body.country, 80) : undefined,
        gdUsername: body.gdUsername !== undefined ? clipText(body.gdUsername, 80) : undefined,
        discordTag: body.discordTag !== undefined ? clipText(body.discordTag, 80) : undefined,
      },
      select: {
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        country: true,
        gdUsername: true,
        discordTag: true,
      }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật profile.' }, { status: 500 });
  }
}
