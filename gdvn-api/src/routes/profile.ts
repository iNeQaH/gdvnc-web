import { Router } from 'express';
import prisma from '@/db/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';
import { awardedPpForProgress, getWeightedPpBreakdown } from '@/services/ScoringEngine';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/services/recordUtils';
import { clipText } from '@/services/validate';
import { deleteUploadthingKeys, isAllowedImageRef, uploadthingKeysFromRef } from '@/services/uploadthing';
import { getCached, setCache, createRateLimiter } from '@/cache/redis';
// import { requireAuth } from '@/services/auth'; // Not fully implemented in gdvn-api, skipping full auth logic for now or stubbing it.

const router = Router();
const profileRateLimit = createRateLimiter('profile', 30, 60_000);

router.get('/:username', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const { success: rateLimitSuccess, reset } = await profileRateLimit.limit(ip as string);
  if (!rateLimitSuccess) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  try {
    const { username } = req.params;
    
    // We can add a short cache for profile to improve performance
    const cacheKey = `profile:${username}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) return res.json(cached);

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
      return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
    }

    const dedupedRecords = dedupeRecordsByLevel(user.records);

    const classicRecords = dedupedRecords
      .filter((r: any) => r.level.mode === LevelMode.CLASSIC)
      .map((r: any) => ({
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

    classicRecords.sort((a: any, b: any) => {
      const pa = a.placement ?? Number.POSITIVE_INFINITY;
      const pb = b.placement ?? Number.POSITIVE_INFINITY;
      return pa - pb || b.basePp - a.basePp;
    });

    const classicForPp = classicRecords.filter((r: any) => r.qualifiesForPp);
    const classicBreakdown = getWeightedPpBreakdown(classicForPp);

    const platformerCompletions = dedupedRecords
      .filter((r: any) => r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
      .map((r: any) => ({
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
      .sort((a: any, b: any) => {
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

    const createdById = new Map(user.createdLevels.map((l: any) => [l.id, { ...l, workId: null as string | null }]));
    const workByGd = new Map(
      user.creatorWorks
        .filter((w: any) => w.gdLevelId)
        .map((w: any) => [w.gdLevelId as number, w])
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

    // Removed the 3 COUNT queries
    const classicRank = null;
    const platformerRank = null;
    const creatorRank = null;

    const data = {
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
    };
    
    await setCache(cacheKey, data, 60); // 1 minute cache
    
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Lỗi truy vấn thông tin người chơi.' });
  }
});

router.patch('/:username', async (req, res) => {
  try {
    // const auth = await requireAuth();
    const { username } = req.params;
    const body = req.body;

    // TODO: implement actual auth verification
    // const isSelf = auth.username === username;
    // const isAdmin = auth.role === 'ADMIN' || auth.role === 'MODERATOR';
    // if (!isSelf && !isAdmin) {
    //   return res.status(403).json({ error: 'Không có quyền sửa profile này' });
    // }

    const current = await prisma.user.findUnique({
      where: { username },
      select: { gdVerified: true, gdUsername: true, avatarUrl: true, coverUrl: true },
    });
    if (!current) {
      return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
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
      return res.status(400).json({ error: 'Avatar URL không hợp lệ.' });
    }
    if (body.coverUrl !== undefined && !isAllowedImageRef(body.coverUrl)) {
      return res.status(400).json({ error: 'Cover URL không hợp lệ.' });
    }

    const nextAvatar =
      body.avatarUrl !== undefined ? clipText(body.avatarUrl, 500) : undefined;
    const nextCover =
      body.coverUrl !== undefined ? clipText(body.coverUrl, 500) : undefined;
    const staleKeys = [
      ...(nextAvatar !== undefined && nextAvatar !== (current.avatarUrl || '')
        ? uploadthingKeysFromRef(current.avatarUrl)
        : []),
      ...(nextCover !== undefined && nextCover !== (current.coverUrl || '')
        ? uploadthingKeysFromRef(current.coverUrl)
        : []),
    ];

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

    if (staleKeys.length > 0) {
      void deleteUploadthingKeys(staleKeys).catch(() => {});
    }
    
    // invalidate cache
    const redis = require('@/cache/redis').redis;
    await redis.del(`profile:${username}`);

    return res.json({ success: true, updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(500).json({ error: error.message || 'Lỗi cập nhật profile.' });
  }
});

export default router;
