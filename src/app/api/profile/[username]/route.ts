import { publicApiError } from '@/lib/apiError';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateUserSp, sanitizeUserClan } from '@/lib/clan';
import { RecordStatus, LevelMode } from '@prisma/client';
import { awardedPpForProgress, getWeightedPpBreakdown, UNRANKED_MIN_PP } from '@/lib/ScoringEngine';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/lib/recordUtils';
import { requireAuth } from '@/lib/auth';
import { clipText } from '@/lib/validate';
import {
  deleteUploadthingKeys,
  isAllowedImageRef,
  localUploadRefAllowedForProfile,
  uploadKeyBelongsToUser,
  uploadthingKeysFromRef,
} from '@/lib/uploadthing';
import { deleteUserAccount } from '@/lib/deleteUser';
import { isSuperAdminUser, isStaffRole } from '@/lib/roles';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { validateBioContent } from '@/lib/contentFilter';
import { getSessionUser } from '@/lib/auth';
import { syncUserGdBrowserStats } from '@/lib/gdBrowserSync';
import { recalculateCreatorPoints } from '@/lib/recalculateCreatorPoints';
import { autoLinkUserCreatedLevels } from '@/lib/creatorLevelsSync';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername);

    const userSelect = {
      id: true,
      username: true,
      displayName: true,
      role: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      supporterUntil: true,
      spGrants: {
        select: {
          id: true,
          amount: true,
          expiresAt: true,
          reason: true,
        },
      },
      spPoints: true,
      gdStars: true,
      gdMoons: true,
      gdDemons: true,
      gdStatsUpdatedAt: true,
      displayedBadgeIds: true,
      hideAllBadges: true,
      isBanned: true,
      bannedUntil: true,
      profileTheme: true,
      profileConfig: true,
      banReason: true,
      discordTag: true,
      gdUsername: true,
      gdVerified: true,
      country: true,
      classicPp: true,
      platformerPp: true,
      creatorPoints: true,
      totpEnabled: true,
      nameColor: true,
      nameGradient: true,
      nameGlow: true,
      nameFont: true,
      hasGlitchTheme: true,
      easterEggCompleted: true,
      clanMember: {
        include: {
          clan: {
            select: {
              id: true,
              name: true,
              tag: true,
              slug: true,
              color: true,
              colorGradient: true,
              isSuspended: true,
              contributions: {
                select: {
                  userId: true,
                  spPledged: true,
                  user: {
                    select: {
                      supporterUntil: true,
                      spGrants: {
                        select: { amount: true, expiresAt: true },
                      },
                    },
                  },
                },
              },
              members: {
                select: { userId: true },
              },
            },
          },
        },
      },
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
        },
      },
    } as const;

    let user = await prisma.user.findUnique({
      where: { username },
      select: userSelect,
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: userSelect,
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    const viewer = await getSessionUser();
    if (viewer?.userId && !user.isBanned) {
      // 1. Tự động lấy stats từ GDBrowser (Star, Moon, Demon, Creator Points)
      const synced = await syncUserGdBrowserStats(user, viewer);
      if (synced) {
        const statsChanged =
          user.gdStars !== synced.stars ||
          user.gdMoons !== synced.moons ||
          user.gdDemons !== synced.demons ||
          user.creatorPoints !== synced.cp;

        user.gdStars = synced.stars;
        user.gdMoons = synced.moons;
        user.gdDemons = synced.demons;
        user.creatorPoints = synced.cp;
        user.gdStatsUpdatedAt = new Date();

        if (statsChanged) {
          clearLeaderboardCache();
        }
      }
      // 2. Tự động liên kết các level đã có trong database của người đó vào creatorId
      await autoLinkUserCreatedLevels(user.id, user.gdUsername, user.username);
      // 3. Tự động xét Role Creator theo phẩm chất level cao nhất mà user sở hữu (không ghi đè creatorPoints)
      await recalculateCreatorPoints(user.id);

      // Refresh badges and createdLevels so latest auto-linked levels and auto-awarded badges are reflected in response
      const [refreshedBadges, refreshedLevels] = await Promise.all([
        prisma.userBadge.findMany({
          where: { userId: user.id },
          include: { badge: { include: { badgeCategory: true } } },
        }),
        prisma.level.findMany({
          where: { creatorId: user.id },
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
        }),
      ]);
      (user as any).userBadges = refreshedBadges;
      (user as any).createdLevels = refreshedLevels;
    }

    if (user.isBanned) {
      if (user.bannedUntil && user.bannedUntil <= new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isBanned: false, banReason: null, bannedUntil: null },
        });
        user.isBanned = false;
        user.banReason = null;
        user.bannedUntil = null;
      } else {
        // Return minimal suspension payload - hide avatar, cover, records, stats, clan, etc.
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            isBanned: true,
            banReason: user.banReason,
            bannedUntil: user.bannedUntil,
            avatarUrl: null,
            coverUrl: null,
            bio: null,
            country: null,
            discordTag: null,
            gdUsername: null,
            classicPp: 0,
            platformerPp: 0,
            creatorPoints: 0,
            records: [],
            createdLevels: [],
            badges: [],
            clan: null,
          },
          isBanned: true,
          banReason: user.banReason,
          bannedUntil: user.bannedUntil,
        });
      }
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

    const classicForPp = classicRecords.filter((r) => r.qualifiesForPp);
    const classicBreakdown = getWeightedPpBreakdown(classicForPp);

    const weightedPpByRecordId = new Map<string, number>();
    for (const item of classicBreakdown.items) {
      if (item.recordId) weightedPpByRecordId.set(item.recordId, item.weightedPp);
    }

    classicRecords.sort((a, b) => {
      const wA = weightedPpByRecordId.get(a.recordId) ?? 0;
      const wB = weightedPpByRecordId.get(b.recordId) ?? 0;
      if (wB !== wA) return wB - wA;
      const awA = a.qualifiesForPp ? (a.awardedPp ?? 0) : 0;
      const awB = b.qualifiesForPp ? (b.awardedPp ?? 0) : 0;
      if (awB !== awA) return awB - awA;
      const progA = a.progress ?? 0;
      const progB = b.progress ?? 0;
      if (progB !== progA) return progB - progA;
      const pa = a.placement ?? Number.POSITIVE_INFINITY;
      const pb = b.placement ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });

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

    // Tự động tìm và bổ sung các level đã có trong DB của người này
    const autoLevels = await autoLinkUserCreatedLevels(user.id, user.gdUsername, user.username);
    const combinedLevels = autoLevels.length > 0 ? autoLevels : user.createdLevels;

    const createdById = new Map(combinedLevels.map((l) => [l.id, { ...l, workId: null as string | null }]));
    for (const l of user.createdLevels) {
      if (!createdById.has(l.id)) {
        createdById.set(l.id, { ...l, workId: null });
      }
    }
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

    const userSp = calculateUserSp({ supporterUntil: user.supporterUntil, spGrants: user.spGrants });

    return NextResponse.json(
      {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        isSuperAdmin: isSuperAdminUser(user),
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        supporterUntil: user.supporterUntil,
        spGrants: user.spGrants || [],
        spPoints: user.spPoints || 0,
        gdStars: user.gdStars || 0,
        gdMoons: user.gdMoons || 0,
        gdDemons: user.gdDemons || 0,
        gdStatsUpdatedAt: user.gdStatsUpdatedAt,
        displayedBadgeIds: user.displayedBadgeIds || [],
        hideAllBadges: user.hideAllBadges || false,
        userSp,
        profileTheme: user.profileTheme,
        profileConfig: user.profileConfig,
        isBanned: user.isBanned,
        bannedUntil: user.bannedUntil,
        banReason: user.banReason,
        discordTag: user.discordTag,
        gdUsername: user.gdUsername,
        gdVerified: user.gdVerified,
        country: user.country,
        classicPp: user.classicPp,
        platformerPp: user.platformerPp,
        creatorPoints: user.creatorPoints,
        totpEnabled: user.totpEnabled,
        nameColor: user.nameColor,
        nameGradient: user.nameGradient,
        nameGlow: user.nameGlow,
        nameFont: user.nameFont,
        hasGlitchTheme: user.hasGlitchTheme,
        easterEggCompleted: user.easterEggCompleted,
        clanMember: user.clanMember
          ? {
              ...user.clanMember,
              clan: sanitizeUserClan(user.clanMember.clan),
            }
          : null,
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
    return publicApiError(error, 'Lỗi truy vấn thông tin người chơi.', 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const auth = await requireAuth();
    const { username } = await params;
    const body = await req.json();

    const isSelf = auth.username.toLowerCase() === username.toLowerCase();
    const isOwner = isSuperAdminUser(auth);
    const isStaff = isStaffRole(auth.role);
    if (!isSelf && !isOwner) {
      return NextResponse.json({ error: 'Không có quyền sửa profile này' }, { status: 403 });
    }

    const current = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: {
        id: true,
        role: true,
        username: true,
        gdVerified: true,
        gdUsername: true,
        avatarUrl: true,
        coverUrl: true,
        supporterUntil: true,
        profileConfig: true,
        hasGlitchTheme: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    const isSupporterOrOwner =
      isSuperAdminUser(auth) ||
      Boolean(current.supporterUntil && new Date(current.supporterUntil) > new Date());

    if (
      body.profileTheme === 'glitch' &&
      !current.hasGlitchTheme &&
      !isSuperAdminUser(auth)
    ) {
      return NextResponse.json(
        { error: 'Giao diện này chưa được mở khoá.' },
        { status: 403 }
      );
    }

    if (
      body.profileTheme !== undefined &&
      ['mint', 'custom', 'lavender'].includes(body.profileTheme) &&
      !isSupporterOrOwner
    ) {
      return NextResponse.json(
        { error: 'Giao diện này yêu cầu đặc quyền Supporter.' },
        { status: 403 }
      );
    }

    if (body.profileConfig !== undefined && !isSupporterOrOwner) {
      const currentCfg = (current.profileConfig as Record<string, any>) || {};
      const newCfg = (body.profileConfig as Record<string, any>) || {};

      const supporterKeys = [
        'backgroundUrl',
        'customThemeColor',
        'customThemeColors',
        'customThemeAngle',
        'customBorderColors',
        'customBorderAnimation',
        'customBorderGlowEnabled',
        'customBorderGlowColor',
        'customBorderGlowColors',
        'customBorderGlowAngle',
        'customBorderGlowOpacity',
        'customBorderGlowSync',
      ];

      const hasUnauthorizedPerk = supporterKeys.some((k) => {
        const val = newCfg[k];
        const oldVal = currentCfg[k];
        if (val !== undefined && val !== null && val !== false) {
          return JSON.stringify(val) !== JSON.stringify(oldVal);
        }
        return false;
      });

      if (hasUnauthorizedPerk) {
        return NextResponse.json(
          { error: 'Tùy biến giao diện này yêu cầu đặc quyền Supporter.' },
          { status: 403 }
        );
      }
    }

    const hasNameCustomization =
      body.nameColor !== undefined ||
      body.nameGradient !== undefined ||
      body.nameGlow !== undefined ||
      body.nameFont !== undefined;

    const isClearingName =
      (body.nameColor === null || body.nameColor === undefined || body.nameColor === '') &&
      (body.nameGradient === null || body.nameGradient === undefined || body.nameGradient === '') &&
      (body.nameGlow === null || body.nameGlow === undefined || body.nameGlow === '') &&
      (body.nameFont === null || body.nameFont === undefined || body.nameFont === 'default' || body.nameFont === '');

    if (hasNameCustomization && !isClearingName && !isSupporterOrOwner) {
      return NextResponse.json(
        { error: 'Tùy biến phong cách tên yêu cầu đặc quyền Supporter.' },
        { status: 403 }
      );
    }

    if (!isSelf) {
      if (isSuperAdminUser(current) && !isSuperAdminUser(auth)) {
        return NextResponse.json({ error: 'Không thể sửa profile của Super Admin' }, { status: 403 });
      }
      if (current.role === 'ADMIN' && auth.role !== 'ADMIN' && !isSuperAdminUser(auth)) {
        return NextResponse.json({ error: 'Moderator không thể sửa profile của Admin' }, { status: 403 });
      }
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
    if (
      body.avatarUrl !== undefined &&
      !localUploadRefAllowedForProfile(body.avatarUrl, current.id, auth.userId, isStaff)
    ) {
      return NextResponse.json({ error: 'Avatar URL không thuộc tài khoản này.' }, { status: 403 });
    }
    if (
      body.coverUrl !== undefined &&
      !localUploadRefAllowedForProfile(body.coverUrl, current.id, auth.userId, isStaff)
    ) {
      return NextResponse.json({ error: 'Cover URL không thuộc tài khoản này.' }, { status: 403 });
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

    let nextProfileConfig = body.profileConfig !== undefined ? body.profileConfig : undefined;
    if (nextProfileConfig !== undefined) {
      if (typeof nextProfileConfig !== 'object' || nextProfileConfig === null || Array.isArray(nextProfileConfig)) {
        return NextResponse.json({ error: 'Cấu hình profile không hợp lệ.' }, { status: 400 });
      }
      const serialized = JSON.stringify(nextProfileConfig);
      if (serialized.length > 16_384) {
        return NextResponse.json({ error: 'Dung lượng cấu hình profile quá lớn (tối đa 16KB).' }, { status: 400 });
      }
    }

    if (body.profileMode !== undefined) {
      const baseCfg = (nextProfileConfig !== undefined ? nextProfileConfig : ((current.profileConfig as Record<string, any>) || {})) || {};
      nextProfileConfig = {
        ...baseCfg,
        profileMode: body.profileMode === 'light' ? 'light' : 'dark',
      };
    }

    if (body.bio !== undefined && body.bio !== null) {
      const bioText = String(body.bio).trim();
      if (bioText.length > 0) {
        const bioCheck = validateBioContent(bioText);
        if (!bioCheck.ok) {
          return NextResponse.json({ error: bioCheck.errorVi }, { status: 400 });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: current.id },
      data: {
        displayName: body.displayName !== undefined ? (clipText(body.displayName, 32)?.trim() || null) : undefined,
        bio: body.bio !== undefined ? clipText(body.bio, 2000) : undefined,
        avatarUrl: nextAvatar,
        coverUrl: nextCover,
        country: body.country !== undefined ? clipText(body.country, 80) : undefined,
        gdUsername: nextGdUsername,
        gdVerified: nextGdVerified,
        discordTag: body.discordTag !== undefined ? clipText(body.discordTag, 80) : undefined,
        profileConfig: nextProfileConfig !== undefined ? nextProfileConfig : undefined,
        profileTheme: body.profileTheme !== undefined ? body.profileTheme : undefined,
        displayedBadgeIds: Array.isArray(body.displayedBadgeIds) ? body.displayedBadgeIds.filter((x: any) => typeof x === 'string').slice(0, 3) : undefined,
        hideAllBadges: body.hideAllBadges !== undefined ? Boolean(body.hideAllBadges) : undefined,
        nameColor: body.nameColor !== undefined ? (clipText(body.nameColor, 30)?.trim() || null) : undefined,
        nameGradient: body.nameGradient !== undefined ? (clipText(body.nameGradient, 120)?.trim() || null) : undefined,
        nameGlow: body.nameGlow !== undefined ? (clipText(body.nameGlow, 160)?.trim() || null) : undefined,
        nameFont: body.nameFont !== undefined ? (clipText(body.nameFont, 50)?.trim() || null) : undefined,
      },
      select: {
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        country: true,
        gdUsername: true,
        gdVerified: true,
        discordTag: true,
        profileConfig: true,
        profileTheme: true,
        displayedBadgeIds: true,
        hideAllBadges: true,
        nameColor: true,
        nameGradient: true,
        nameGlow: true,
        nameFont: true,
      }
    });

    if (nextGdUsername !== undefined) {
      void autoLinkUserCreatedLevels(current.id, nextGdUsername, current.username).catch(() => {});
      void recalculateCreatorPoints(current.id).catch(() => {});
      void syncUserGdBrowserStats({ id: current.id, gdUsername: nextGdUsername }, { userId: current.id }, true).catch(() => {});
    }

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
      const ownedKeys = staleRefs
        .filter((url) => !used.has(url))
        .flatMap((url) => uploadthingKeysFromRef(url))
        .filter((key) => uploadKeyBelongsToUser(key, current.id));
      if (ownedKeys.length > 0) {
        void deleteUploadthingKeys(ownedKeys).catch(() => {});
      }
    }

    clearLeaderboardCache();
    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return publicApiError(error, 'Lỗi cập nhật profile.', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const auth = await requireAuth();
    const { username } = await params;
    const targetUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    const isSelf = auth.username.toLowerCase() === username.toLowerCase();
    const isAdmin = auth.role === 'ADMIN';
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Không có quyền xoá tài khoản này.' }, { status: 403 });
    }

    const body = await req.json();
    const reason = body?.reason || '';
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập lý do xoá tài khoản.' }, { status: 400 });
    }

    const password = typeof body?.password === 'string' ? body.password : undefined;
    const result = await deleteUserAccount(auth.userId, targetUser.id, reason, { password });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: 'Đã xoá tài khoản thành công.' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return publicApiError(error, 'Lỗi xoá tài khoản.', 500);
  }
}




