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
import { deleteUploadthingKeys, isAllowedImageRef, uploadthingKeysFromRef } from '@/lib/uploadthing';

export const dynamic = 'force-dynamic';

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
        gdVerified: true,
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
            difficultyFace: true,
            isVN: true,
            isChallenge: true,
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

    const createdById = new Map(user.createdLevels.map((l) => [l.id, { ...l, workId: null as string | null }]));
    const workByGd = new Map(
      user.creatorWorks
        .filter((w) => w.gdLevelId)
        .map((w) => [w.gdLevelId as number, w])
    );
    for (const lvl of createdById.values()) {
      const work = workByGd.get(lvl.gdLevelId);
      if (work) lvl.workId = work.id;
    }
    for (const work of user.creatorWorks) {
      if (!work.gdLevelId) continue;
      const exists = [...createdById.values()].some((l) => l.gdLevelId === work.gdLevelId);
      if (exists) continue;
      createdById.set(`work:${work.id}`, {
        id: `work:${work.id}`,
        gdLevelId: work.gdLevelId,
        name: work.levelName || `ID ${work.gdLevelId}`,
        mode: 'CLASSIC',
        placement: null,
        basePp: 0,
        difficulty: 'Demon',
        ratingType: 'NONE',
        youtubeId: null,
        difficultyFace: 0,
        isVN: false,
        isChallenge: false,
        workId: work.id,
      });
    }
    const createdLevels = Array.from(createdById.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
    );

    const classicRank = user.classicPp > 0.005 ? (await prisma.user.count({
      where: { classicPp: { gt: user.classicPp } },
    })) + 1 : null;

    const platformerRank = user.platformerPp > 0.005 ? (await prisma.user.count({
      where: { platformerPp: { gt: user.platformerPp } },
    })) + 1 : null;

    const allCreatorRanks = await prisma.user.count({
      where: { creatorPoints: { gt: user.creatorPoints } },
    });
    const creatorRank = allCreatorRanks + 1;

    return NextResponse.json(
      {
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
        gdVerified: user.gdVerified,
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
        createdLevels,
        creatorWorks: user.creatorWorks,
        totalRecordsCount: dedupedRecords.length,
        badges: user.userBadges
          .slice()
          .sort((a: any, b: any) => (a.badge.sortOrder ?? 0) - (b.badge.sortOrder ?? 0))
          .map((ub: any) => ub.badge),
      },
    },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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
    const isAdmin = auth.role === 'ADMIN' || auth.role === 'MODERATOR';
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Không có quyền sửa profile này' }, { status: 403 });
    }

    const current = await prisma.user.findUnique({
      where: { username },
      select: { id: true, gdVerified: true, gdUsername: true, avatarUrl: true, coverUrl: true },
    });
    if (!current) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    let nextGdUsername: string | null | undefined =
      body.gdUsername !== undefined ? (clipText(body.gdUsername, 80) || null) : undefined;
    let nextGdVerified: boolean | undefined;
    if (nextGdUsername !== undefined) {
      const prev = (current.gdUsername || '').trim().toLowerCase();
      const next = (nextGdUsername || '').trim().toLowerCase();
      if (next !== prev) {
        nextGdVerified = false;
      }
    }

    if (body.avatarUrl !== undefined && !isAllowedImageRef(body.avatarUrl)) {
      return NextResponse.json({ error: 'Avatar URL không hợp lệ.' }, { status: 400 });
    }
    if (body.coverUrl !== undefined && !isAllowedImageRef(body.coverUrl)) {
      return NextResponse.json({ error: 'Cover URL không hợp lệ.' }, { status: 400 });
    }

    const nextAvatar =
      body.avatarUrl !== undefined ? clipText(body.avatarUrl, 500) : undefined;
    const nextCover =
      body.coverUrl !== undefined ? clipText(body.coverUrl, 500) : undefined;
    const staleRefs: string[] = [];
    if (nextAvatar !== undefined && nextAvatar !== (current.avatarUrl || '') && current.avatarUrl) {
      staleRefs.push(current.avatarUrl);
    }
    if (nextCover !== undefined && nextCover !== (current.coverUrl || '') && current.coverUrl) {
      staleRefs.push(current.coverUrl);
    }

    const updated = await prisma.user.update({
      where: { username },
      data: {
        bio: body.bio !== undefined ? clipText(body.bio, 2000) : undefined,
        avatarUrl: nextAvatar,
        coverUrl: nextCover,
        country: body.country !== undefined ? clipText(body.country, 80) : undefined,
        gdUsername: nextGdUsername,
        gdVerified: nextGdVerified,
        discordTag: body.discordTag !== undefined ? clipText(body.discordTag, 80) : undefined,
      },
      select: {
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        country: true,
        gdUsername: true,
        gdVerified: true,
        discordTag: true,
      }
    });

    if (staleRefs.length > 0) {
      const stillUsed = await prisma.user.findMany({
        where: {
          id: { not: current.id },
          OR: [{ avatarUrl: { in: staleRefs } }, { coverUrl: { in: staleRefs } }],
        },
        select: { avatarUrl: true, coverUrl: true },
      });
      const used = new Set(
        stillUsed.flatMap((row) => [row.avatarUrl, row.coverUrl]).filter((url): url is string => Boolean(url))
      );
      const ownedKeys = staleRefs.filter((url) => !used.has(url)).flatMap((url) => uploadthingKeysFromRef(url));
      if (ownedKeys.length > 0) {
        void deleteUploadthingKeys(ownedKeys).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật profile.' }, { status: 500 });
  }
}
