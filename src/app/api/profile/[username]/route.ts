import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { getWeightedPpBreakdown } from '@/lib/ScoringEngine';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/lib/recordUtils';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        records: {
          where: { status: RecordStatus.APPROVED },
          include: {
            level: true,
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
        createdLevels: true,
        creatorWorks: {
          orderBy: { submittedAt: 'desc' },
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
        placement: r.level.placement || 999,
        basePp: r.level.basePp,
        progress: r.progress,
        qualifiesForPp: isQualifyingClassicRecord(r, r.level),
        recordId: r.id,
        videoUrl: r.videoUrl,
        hz: r.hz,
        device: r.device,
        submittedAt: r.submittedAt,
      }));

    const classicForPp = classicRecords.filter((r) => r.qualifiesForPp);
    const classicBreakdown = getWeightedPpBreakdown(classicForPp);

    const platformerCompletions = dedupedRecords
      .filter((r) => r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
      .map((r) => ({
        name: r.level.name,
        placement: r.level.placement || 999,
        basePp: r.level.basePp,
        timeMs: r.timeMs,
        recordId: r.id,
        videoUrl: r.videoUrl,
        hz: r.hz,
        device: r.device,
        submittedAt: r.submittedAt,
      }));

    let hardestClassic = null;
    if (classicForPp.length > 0) {
      hardestClassic = [...classicForPp].sort((a, b) => a.placement - b.placement)[0];
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
    const { username } = await params;
    const body = await req.json();

    // Verify requesting user matches target user or is ADMIN
    if (!body.requesterId) {
       return NextResponse.json({ error: 'Cần xác thực' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({ where: { id: body.requesterId } });
    if (!requester || (requester.username !== username && requester.role !== 'ADMIN' && requester.username !== 'iNeQaH')) {
       return NextResponse.json({ error: 'Không có quyền sửa profile này' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { username },
      data: {
        bio: body.bio !== undefined ? body.bio : undefined,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : undefined,
        coverUrl: body.coverUrl !== undefined ? body.coverUrl : undefined,
        country: body.country !== undefined ? body.country : undefined,
        gdUsername: body.gdUsername !== undefined ? body.gdUsername : undefined,
        discordTag: body.discordTag !== undefined ? body.discordTag : undefined,
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
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật profile.' }, { status: 500 });
  }
}
