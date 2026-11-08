import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelMode } from '@prisma/client';
import { playerDisplayName } from '@/lib/leaderboard';
import { publicApiError } from '@/lib/apiError';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';
import { isSuperAdminUser } from '@/lib/roles';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';

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
  platformerPp: true,
  creatorPoints: true,
  role: true,
} as const;

export async function GET() {
  try {
    const payload = await cachedJson(
      async () => {
        const [
          dbClassic,
          dbPlatformer,
          topPlayerRow,
          topPlatformerPlayerRow,
          topCreatorRow,
          topSupporterUser,
          clans,
        ] = await Promise.all([
          prisma.level.findFirst({
            where: { isVN: true, isChallenge: false, mode: LevelMode.CLASSIC, vnPlacement: { not: null } },
            orderBy: { vnPlacement: 'asc' },
            select: highlightSelect,
          }),
          prisma.level.findFirst({
            where: { isVN: true, isChallenge: false, mode: LevelMode.PLATFORMER, vnPlacement: { not: null } },
            orderBy: [{ vnPlacement: 'asc' }, { placement: 'asc' }, { name: 'asc' }],
            select: highlightSelect,
          }),
          prisma.user.findFirst({
            where: { classicPp: { gt: 0 } },
            orderBy: { classicPp: 'desc' },
            select: userHighlightSelect,
          }),
          prisma.user.findFirst({
            where: { platformerPp: { gt: 0 } },
            orderBy: { platformerPp: 'desc' },
            select: userHighlightSelect,
          }),
          prisma.user.findFirst({
            where: { creatorPoints: { gt: 0 } },
            orderBy: { creatorPoints: 'desc' },
            select: userHighlightSelect,
          }),
          prisma.user.findFirst({
            where: {
              OR: [
                { supporterTotalMonths: { gt: 0 } },
                { supporterUntil: { gt: new Date() } },
              ],
              hideSupporterPublic: false,
              isBanned: false,
            },
            orderBy: [
              { supporterTotalMonths: 'desc' },
              { supporterUntil: 'desc' },
              { lastSupportedAt: 'desc' },
            ],
            select: {
              id: true,
              username: true,
              displayName: true,
              gdUsername: true,
              avatarUrl: true,
              supporterTotalMonths: true,
              supporterUntil: true,
              role: true,
            },
          }),
          prisma.clan.findMany({
            where: { isSuspended: false },
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      classicPp: true,
                      platformerPp: true,
                      creatorPoints: true,
                    },
                  },
                },
              },
              contributions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      supporterUntil: true,
                      spGrants: {
                        select: { amount: true, expiresAt: true },
                      },
                    },
                  },
                },
              },
            },
          }),
        ]);

        // 1. Tính toán Top Supporter (lấy từ supporterTotalMonths / supporterUntil chính xác, loại trừ Owner)
        let topSupporter = null;
        if (topSupporterUser && !isSuperAdminUser(topSupporterUser)) {
          const nowMs = Date.now();
          const activeMonths = topSupporterUser.supporterUntil && new Date(topSupporterUser.supporterUntil).getTime() > nowMs
            ? Math.ceil((new Date(topSupporterUser.supporterUntil).getTime() - nowMs) / (30 * 24 * 3600 * 1000))
            : 0;
          const totalMonths = Math.max(topSupporterUser.supporterTotalMonths || 0, activeMonths);

          topSupporter = {
            id: topSupporterUser.id,
            username: topSupporterUser.username,
            gdUsername: topSupporterUser.gdUsername,
            displayName: playerDisplayName(topSupporterUser),
            avatarUrl: topSupporterUser.avatarUrl,
            totalMonths,
          };
        }

        // 2. Tính toán Clan Stats cho từng hạng mục
        const clanStats = clans.map((c) => {
          const memberIds = new Set(c.members.map((m) => m.userId));
          let totalSp = 0;
          for (const contrib of c.contributions) {
            if (!memberIds.has(contrib.userId)) continue;
            const userMax = calculateUserSp(contrib.user);
            totalSp += Math.min(contrib.spPledged, userMax);
          }
          const tierInfo = getClanTier(totalSp);
          const totalClassicPp = c.members.reduce((sum, m) => sum + (m.user?.classicPp || 0), 0);
          const totalPlatformerPp = c.members.reduce((sum, m) => sum + (m.user?.platformerPp || 0), 0);
          const totalCreatorPoints = c.members.reduce((sum, m) => sum + (m.user?.creatorPoints || 0), 0);
          const memberCount = c.members.length;

          const clanInfo = {
            id: c.id,
            name: c.name,
            tag: c.tag,
            slug: c.slug,
            color: c.color,
            colorGradient: tierInfo.tier >= 2 ? c.colorGradient : null,
            tier: tierInfo.tier,
          };

          return {
            clan: clanInfo,
            classicPp: totalClassicPp,
            platformerPp: totalPlatformerPp,
            creatorPoints: totalCreatorPoints,
            totalSp,
            memberCount,
          };
        });

        const topClanClassic = [...clanStats].sort((a, b) => b.classicPp - a.classicPp)[0] || null;
        const topClanPlatformer = [...clanStats].sort((a, b) => b.platformerPp - a.platformerPp)[0] || null;
        const topClanCreator = [...clanStats].sort((a, b) => b.creatorPoints - a.creatorPoints)[0] || null;
        const topClanSp = [...clanStats].sort((a, b) => b.totalSp - a.totalSp)[0] || null;
        const topClanMembers = [...clanStats].sort((a, b) => b.memberCount - a.memberCount)[0] || null;

        return {
          success: true,
          highlights: {
            topClassicLevel: dbClassic,
            topPlatformerLevel: dbPlatformer,
            topPlayer: topPlayerRow
              ? {
                  id: topPlayerRow.id,
                  username: topPlayerRow.username,
                  gdUsername: topPlayerRow.gdUsername,
                  displayName: playerDisplayName(topPlayerRow),
                  avatarUrl: topPlayerRow.avatarUrl,
                  classicPp: topPlayerRow.classicPp,
                  isLegacy: false,
                }
              : null,
            topPlatformerPlayer: topPlatformerPlayerRow
              ? {
                  id: topPlatformerPlayerRow.id,
                  username: topPlatformerPlayerRow.username,
                  gdUsername: topPlatformerPlayerRow.gdUsername,
                  displayName: playerDisplayName(topPlatformerPlayerRow),
                  avatarUrl: topPlatformerPlayerRow.avatarUrl,
                  platformerPp: topPlatformerPlayerRow.platformerPp,
                  isLegacy: false,
                }
              : null,
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
            topSupporter,
            topClans: {
              classic: topClanClassic ? { clan: topClanClassic.clan, value: topClanClassic.classicPp } : null,
              platformer: topClanPlatformer ? { clan: topClanPlatformer.clan, value: topClanPlatformer.platformerPp } : null,
              creator: topClanCreator ? { clan: topClanCreator.clan, value: topClanCreator.creatorPoints } : null,
              sp: topClanSp ? { clan: topClanSp.clan, value: topClanSp.totalSp } : null,
              members: topClanMembers ? { clan: topClanMembers.clan, value: topClanMembers.memberCount } : null,
            },
          },
        };
      },
      ['leaderboard-highlights'],
      [CACHE_TAGS.highlights, CACHE_TAGS.leaderboard],
      120
    );

    return NextResponse.json(payload, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    return publicApiError(error, 'Lỗi tải Top 1.');
  }
}

