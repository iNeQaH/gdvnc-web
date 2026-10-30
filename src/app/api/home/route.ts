import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';
import { playerDisplayName } from '@/lib/leaderboard';
import { LevelMode } from '@prisma/client';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';
import { getVnTodayString } from '@/lib/activityPoints';
import { WEB_CHANGELOGS } from '@/lib/webChangelogs';

export const dynamic = 'force-dynamic';

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
  displayName: true,
  gdUsername: true,
  avatarUrl: true,
  classicPp: true,
  platformerPp: true,
  creatorPoints: true,
  role: true,
  nameColor: true,
  nameGradient: true,
  nameGlow: true,
  nameFont: true,
} as const;

export async function GET() {
  try {
    const data = await cachedJson(
      async () => {
        const now = new Date();
        const todayVn = getVnTodayString();

        const [
          posts,
          announcements,
          recentSupporters,
          topSupporters,
          dbClassic,
          dbFeatured,
          dbChallenge,
          topPlayerRow,
          topPlatformerPlayerRow,
          topStarPlayerRow,
          topMoonPlayerRow,
          topDemonPlayerRow,
          topCreatorRow,
          clans,
        ] = await Promise.all([
          // 1. Home Posts (admin posts / featured spotlight)
          prisma.homePost.findMany({
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            take: 10,
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
          }),

          // 2. Latest System Announcements
          prisma.siteAnnouncement.findMany({
            where: {
              audience: 'ALL',
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              excerpt: true,
              body: true,
              createdAt: true,
              likedUserIds: true,
              author: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          }),

          // 3. Recent Supporters (tên + số tháng, lọc hideSupporterPublic)
          prisma.user.findMany({
            where: {
              OR: [
                { lastSupportedAt: { not: null } },
                { supporterUntil: { gt: now } },
              ],
              hideSupporterPublic: false,
              isBanned: false,
            },
            orderBy: [{ lastSupportedAt: 'desc' }, { supporterUntil: 'desc' }],
            take: 12,
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              supporterTotalMonths: true,
              supporterUntil: true,
              lastSupportedAt: true,
              clanMember: { select: { clan: { select: { tag: true } } } },
              nameColor: true,
              nameGradient: true,
              nameGlow: true,
              nameFont: true,
            },
          }),

          // 4. Top Supporters (nhiều tháng nhất, lọc hideSupporterPublic)
          prisma.user.findMany({
            where: {
              OR: [
                { supporterTotalMonths: { gt: 0 } },
                { supporterUntil: { gt: now } },
              ],
              hideSupporterPublic: false,
              isBanned: false,
            },
            orderBy: [{ supporterTotalMonths: 'desc' }, { supporterUntil: 'desc' }, { lastSupportedAt: 'desc' }],
            take: 8,
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              supporterTotalMonths: true,
              supporterUntil: true,
              clanMember: { select: { clan: { select: { tag: true } } } },
              nameColor: true,
              nameGradient: true,
              nameGlow: true,
              nameFont: true,
            },
          }),

          // 5. Highlights: Top 1 Classic Level
          prisma.level.findFirst({
            where: { mode: LevelMode.CLASSIC, isChallenge: false, placement: { not: null } },
            orderBy: { placement: 'asc' },
            select: highlightSelect,
          }),

          // 6. Highlights: Top 1 Featured List Level (VN)
          prisma.level.findFirst({
            where: { isVN: true, isChallenge: false, vnPlacement: { not: null } },
            orderBy: { vnPlacement: 'asc' },
            select: highlightSelect,
          }),

          // 7. Highlights: Top 1 Challenge List Level
          prisma.level.findFirst({
            where: { isChallenge: true, placement: { not: null } },
            orderBy: { placement: 'asc' },
            select: highlightSelect,
          }),

          // 8. Highlights: Top 1 Classic Player
          prisma.user.findFirst({
            where: { isBanned: false, classicPp: { gt: 0 } },
            orderBy: { classicPp: 'desc' },
            select: userHighlightSelect,
          }),

          // 9. Highlights: Top 1 Platformer Player
          prisma.user.findFirst({
            where: { isBanned: false, platformerPp: { gt: 0 } },
            orderBy: { platformerPp: 'desc' },
            select: userHighlightSelect,
          }),

          // 10. Highlights: Top 1 Star Player
          prisma.user.findFirst({
            where: { isBanned: false, gdStars: { gt: 0 } },
            orderBy: { gdStars: 'desc' },
            select: {
              ...userHighlightSelect,
              gdStars: true,
            },
          }),

          // 11. Highlights: Top 1 Moon Player
          prisma.user.findFirst({
            where: { isBanned: false, gdMoons: { gt: 0 } },
            orderBy: { gdMoons: 'desc' },
            select: {
              ...userHighlightSelect,
              gdMoons: true,
            },
          }),

          // 12. Highlights: Top 1 Demon Player
          prisma.user.findFirst({
            where: { isBanned: false, gdDemons: { gt: 0 } },
            orderBy: { gdDemons: 'desc' },
            select: {
              ...userHighlightSelect,
              gdDemons: true,
            },
          }),

          // 13. Highlights: Top 1 Creator
          prisma.user.findFirst({
            where: { isBanned: false, creatorPoints: { gt: 0 } },
            orderBy: { creatorPoints: 'desc' },
            select: userHighlightSelect,
          }),

          // 14. Highlights: Clan query
          prisma.clan.findMany({
            where: { isSuspended: false },
            include: {
              members: {
                select: {
                  user: {
                    select: {
                      classicPp: true,
                      platformerPp: true,
                      activityPoints: true,
                      activityDate: true,
                      supporterUntil: true,
                      spGrants: {
                        select: { amount: true, expiresAt: true },
                      },
                    },
                  },
                },
              },
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
            },
          }),
        ]);

        // Process clans
        const rankedClans = clans.map((c) => {
          let totalSp = 0;
          for (const cont of c.contributions) {
            const userMaxSp = calculateUserSp(cont.user);
            totalSp += Math.max(0, Math.min(cont.spPledged, userMaxSp));
          }
          const tierInfo = getClanTier(totalSp);

          let totalActivityPoints = 0;
          for (const m of c.members) {
            if (m.user.activityDate === todayVn) {
              totalActivityPoints += m.user.activityPoints || 0;
            }
          }

          return {
            id: c.id,
            name: c.name,
            tag: c.tag,
            slug: c.slug,
            color: c.color,
            colorGradient: tierInfo.tier >= 2 ? c.colorGradient : null,
            totalSp,
            totalActivityPoints,
          };
        });

        const clansByActivity = [...rankedClans].sort((a, b) => b.totalActivityPoints - a.totalActivityPoints);
        const topActivityClan = clansByActivity[0] || null;

        const clansBySp = [...rankedClans].sort((a, b) => b.totalSp - a.totalSp);
        const topSpClan = clansBySp[0] || null;

        const mappedRecentSupporters = recentSupporters.map((s: any) => ({
          ...s,
          clan: s.clanMember?.clan || null,
          supporterTotalMonths: s.supporterTotalMonths || 1,
        }));

        const mappedTopSupporters = topSupporters.map((s: any) => ({
          ...s,
          clan: s.clanMember?.clan || null,
          supporterTotalMonths: s.supporterTotalMonths || 1,
        }));

        return {
          success: true,
          posts,
          announcements,
          recentSupporters: mappedRecentSupporters,
          topSupporters: mappedTopSupporters,
          changelogs: WEB_CHANGELOGS,
          highlights: {
            topPlayer: topPlayerRow ? { ...topPlayerRow, displayName: playerDisplayName(topPlayerRow) } : null,
            topPlatformerPlayer: topPlatformerPlayerRow ? { ...topPlatformerPlayerRow, displayName: playerDisplayName(topPlatformerPlayerRow) } : null,
            topClassicLevel: dbClassic,
            topFeaturedLevel: dbFeatured,
            topChallengeLevel: dbChallenge,
            topStarPlayer: topStarPlayerRow ? { ...topStarPlayerRow, displayName: playerDisplayName(topStarPlayerRow) } : null,
            topMoonPlayer: topMoonPlayerRow ? { ...topMoonPlayerRow, displayName: playerDisplayName(topMoonPlayerRow) } : null,
            topDemonPlayer: topDemonPlayerRow ? { ...topDemonPlayerRow, displayName: playerDisplayName(topDemonPlayerRow) } : null,
            topActivityClan,
            topSpClan,
            topCreator: topCreatorRow ? { ...topCreatorRow, displayName: playerDisplayName(topCreatorRow) } : null,
            topSupporter: mappedTopSupporters.length > 0 ? { ...mappedTopSupporters[0], displayName: playerDisplayName(mappedTopSupporters[0]) } : null,
          },
        };
      },
      ['home-portal-v2'],
      [CACHE_TAGS.highlights, CACHE_TAGS.home],
      15
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tải dữ liệu trang chủ.', 500);
  }
}
