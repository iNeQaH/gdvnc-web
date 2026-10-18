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
          notifs,
          redeems,
          allUsers,
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
          prisma.notification.findMany({
            where: {
              OR: [
                { title: { contains: 'Quyên góp' } },
                { title: { contains: 'Supporter' } },
                { message: { contains: 'tháng Supporter' } },
              ],
            },
            select: { userId: true, message: true },
          }),
          prisma.redeemCodeUse.findMany({
            select: {
              userId: true,
              code: { select: { months: true } },
            },
          }),
          prisma.user.findMany({
            select: {
              id: true,
              username: true,
              gdUsername: true,
              avatarUrl: true,
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
                        where: { expiresAt: { gt: new Date() } },
                        select: { amount: true, expiresAt: true },
                      },
                    },
                  },
                },
              },
            },
          }),
        ]);

        // 1. Tính toán Top Supporter (tổng số tháng donate lịch sử, loại trừ Owner)
        const userMonthsMap = new Map<string, number>();
        for (const n of notifs) {
          if (!n.userId) continue;
          const match = n.message.match(/(\d+)\s+tháng\s+Supporter/i);
          if (match) {
            const m = parseInt(match[1], 10);
            userMonthsMap.set(n.userId, (userMonthsMap.get(n.userId) || 0) + m);
          }
        }
        for (const r of redeems) {
          if (!r.userId || !r.code) continue;
          userMonthsMap.set(r.userId, (userMonthsMap.get(r.userId) || 0) + (r.code.months || 0));
        }

        const userMap = new Map(allUsers.map((u) => [u.id, u]));
        let topSupporter = null;
        let maxMonths = 0;

        for (const [userId, months] of userMonthsMap.entries()) {
          const u = userMap.get(userId);
          if (!u || isSuperAdminUser(u)) continue;
          if (months > maxMonths) {
            maxMonths = months;
            topSupporter = {
              id: u.id,
              username: u.username,
              gdUsername: u.gdUsername,
              displayName: playerDisplayName(u),
              avatarUrl: u.avatarUrl,
              totalMonths: months,
            };
          }
        }

        // 2. Tính toán Clan Stats cho từng hạng mục
        const clanStats = clans.map((c) => {
          const memberIds = new Set(c.members.map((m) => m.userId));
          let totalSp = 3;
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

