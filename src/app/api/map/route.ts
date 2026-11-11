import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getPlayerLeaderboard,
  getCreatorLeaderboard,
  getStatLeaderboard,
  getActivityLeaderboard,
} from '@/lib/leaderboard';
import { extractProvinceFromLocation, VN_PROVINCES } from '@/lib/location';

export const dynamic = 'force-dynamic';

interface MapCacheEntry {
  timestamp: number;
  data: any;
}

const mapCache = new Map<string, MapCacheEntry>();
const CACHE_TTL = 30_000; // 30s

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'POPULATION').toUpperCase();

    const cacheKey = `map:${mode}`;
    const cached = mapCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Khởi tạo map cho 63 tỉnh
    const provinceMap: Record<
      string,
      {
        totalScore: number;
        players: Array<{
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
          nameColor?: string | null;
          nameGradient?: string | null;
          nameGlow?: string | null;
          nameFont?: string | null;
          profileTheme?: string | null;
          profileConfig?: any;
          clan?: { tag?: string | null; name?: string | null; color?: string | null; colorGradient?: string | null } | null;
          clanTag?: string | null;
          clanColor?: string | null;
          clanGradient?: string | null;
          hardestClassicLevel?: { id: string; name: string; difficulty?: string | null; placement?: number | null } | null;
          score: number;
          rankInProvince: number;
          classicPp?: number;
          platformerPp?: number;
          challengePp?: number;
          creatorPoints?: number;
          gdStars?: number;
          gdMoons?: number;
          gdDemons?: number;
          activityPoints?: number;
        }>;
        topStats?: {
          classic?: any | null;
          platformer?: any | null;
          demons?: any | null;
          stars?: any | null;
          creator?: any | null;
        };
        hardestClassic?: { id: string; name: string; difficulty?: string | null; placement?: number | null } | null;
        clans?: Array<{ tag: string; color?: string | null; colorGradient?: string | null }>;
      }
    > = {};

    for (const prov of VN_PROVINCES) {
      provinceMap[prov] = {
        totalScore: 0,
        players: [],
        topStats: {},
      };
    }

    if (mode === 'POPULATION') {
      // Chế độ Mặc Định: Xếp theo số lượng người dùng trong tỉnh & Tính Top 1 các bảng xếp hạng
      const allUsers = await prisma.user.findMany({
        where: {
          isBanned: false,
          country: { not: null },
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          gdUsername: true,
          avatarUrl: true,
          nameColor: true,
          nameGradient: true,
          nameGlow: true,
          nameFont: true,
          profileTheme: true,
          profileConfig: true,
          country: true,
          classicPp: true,
          platformerPp: true,
          challengePp: true,
          creatorPoints: true,
          gdStars: true,
          gdMoons: true,
          gdDemons: true,
          activityPoints: true,
          hardestClassicLevel: {
            select: {
              id: true,
              name: true,
              difficulty: true,
              placement: true,
            },
          },
          clanMember: { select: { clan: { select: { tag: true, name: true, color: true, colorGradient: true } } } },
        },
        orderBy: { classicPp: 'desc' },
      });

      for (const u of allUsers) {
        const prov = extractProvinceFromLocation(u.country);
        if (prov && provinceMap[prov]) {
          const displayScore = u.classicPp || u.platformerPp || u.gdStars || 0;
          const userClan = (u as any).clanMember?.clan || null;
          provinceMap[prov].players.push({
            id: u.id,
            username: u.username,
            displayName: u.displayName || u.gdUsername || u.username,
            avatarUrl: u.avatarUrl,
            nameColor: u.nameColor,
            nameGradient: u.nameGradient,
            nameGlow: u.nameGlow,
            nameFont: u.nameFont,
            profileTheme: u.profileTheme,
            profileConfig: u.profileConfig,
            clan: userClan,
            clanTag: userClan?.tag || null,
            clanColor: userClan?.color || null,
            clanGradient: userClan?.colorGradient || null,
            hardestClassicLevel: (u as any).hardestClassicLevel || null,
            score: Math.round(displayScore * 100) / 100,
            rankInProvince: 0,
            classicPp: u.classicPp || 0,
            platformerPp: u.platformerPp || 0,
            challengePp: u.challengePp || 0,
            creatorPoints: u.creatorPoints || 0,
            gdStars: u.gdStars || 0,
            gdMoons: u.gdMoons || 0,
            gdDemons: u.gdDemons || 0,
            activityPoints: u.activityPoints || 0,
          });
        }
      }

      // Sắp xếp người chơi & Tìm Top 1 các thể loại cho từng tỉnh
      for (const prov of VN_PROVINCES) {
        const list = provinceMap[prov].players;
        provinceMap[prov].totalScore = list.length; // Điểm tỉnh là số lượng người chơi

        // Tìm Top 1 các loại bảng xếp hạng của tỉnh đó
        let topClassic: any = null;
        let topPlatformer: any = null;
        let topDemons: any = null;
        let topStars: any = null;
        let topCreator: any = null;

        for (const p of list) {
          if ((p.classicPp || 0) > (topClassic?.classicPp || 0)) topClassic = p;
          if ((p.platformerPp || 0) > (topPlatformer?.platformerPp || 0)) topPlatformer = p;
          if ((p.gdDemons || 0) > (topDemons?.gdDemons || 0)) topDemons = p;
          if ((p.gdStars || 0) > (topStars?.gdStars || 0)) topStars = p;
          if ((p.creatorPoints || 0) > (topCreator?.creatorPoints || 0)) topCreator = p;
        }

        provinceMap[prov].topStats = {
          classic: topClassic && topClassic.classicPp > 0 ? {
            username: topClassic.username,
            displayName: topClassic.displayName,
            avatarUrl: topClassic.avatarUrl,
            score: Number(topClassic.classicPp.toFixed(2)),
          } : null,
          platformer: topPlatformer && topPlatformer.platformerPp > 0 ? {
            username: topPlatformer.username,
            displayName: topPlatformer.displayName,
            avatarUrl: topPlatformer.avatarUrl,
            score: Number(topPlatformer.platformerPp.toFixed(2)),
          } : null,
          demons: topDemons && topDemons.gdDemons > 0 ? {
            username: topDemons.username,
            displayName: topDemons.displayName,
            avatarUrl: topDemons.avatarUrl,
            score: topDemons.gdDemons,
          } : null,
          stars: topStars && topStars.gdStars > 0 ? {
            username: topStars.username,
            displayName: topStars.displayName,
            avatarUrl: topStars.avatarUrl,
            score: topStars.gdStars,
          } : null,
          creator: topCreator && topCreator.creatorPoints > 0 ? {
            username: topCreator.username,
            displayName: topCreator.displayName,
            avatarUrl: topCreator.avatarUrl,
            score: topCreator.creatorPoints,
          } : null,
        };
      }
    } else {
      // Các chế độ xếp hạng khác
      let rawLeaderboard: any[] = [];
      if (mode === 'CREATOR') {
        rawLeaderboard = await getCreatorLeaderboard();
      } else if (mode === 'STARS') {
        rawLeaderboard = await getStatLeaderboard('stars');
      } else if (mode === 'MOONS') {
        rawLeaderboard = await getStatLeaderboard('moons');
      } else if (mode === 'DEMONS') {
        rawLeaderboard = await getStatLeaderboard('demons');
      } else if (mode === 'ACTIVITY') {
        rawLeaderboard = await getActivityLeaderboard('this');
      } else if (mode === 'PLATFORMER' || mode === 'CHALLENGE' || mode === 'CLASSIC') {
        rawLeaderboard = await getPlayerLeaderboard(mode as any, 'ALL');
      } else {
        rawLeaderboard = await getPlayerLeaderboard('CLASSIC', 'ALL');
      }

      const getScore = (p: any): number => {
        if (mode === 'CREATOR') return p.creatorPoints || 0;
        if (mode === 'STARS') return p.statValue ?? p.gdStars ?? 0;
        if (mode === 'MOONS') return p.statValue ?? p.gdMoons ?? 0;
        if (mode === 'DEMONS') return p.statValue ?? p.gdDemons ?? 0;
        if (mode === 'ACTIVITY') return p.activityPoints || 0;
        if (mode === 'PLATFORMER') return p.platformerPp || 0;
        if (mode === 'CHALLENGE') return p.challengePp || 0;
        return p.classicPp || 0;
      };

      for (const player of rawLeaderboard) {
        const score = getScore(player);
        if (score <= 0) continue;

        const prov = extractProvinceFromLocation(player.country);
        if (prov && provinceMap[prov]) {
          const userClan = player.clan || (player.clanMember?.clan ? player.clanMember.clan : null);
          provinceMap[prov].totalScore += score;
          provinceMap[prov].players.push({
            id: player.id || player.userId || player.username,
            username: player.username || '',
            displayName: player.displayName || player.gdUsername || player.username || 'User',
            avatarUrl: player.avatarUrl || null,
            nameColor: player.nameColor || null,
            nameGradient: player.nameGradient || null,
            nameGlow: player.nameGlow || null,
            nameFont: player.nameFont || null,
            profileTheme: player.profileTheme || null,
            profileConfig: player.profileConfig || null,
            clan: userClan,
            clanTag: player.clan?.tag || player.clanMember?.clan?.tag || null,
            clanColor: userClan?.color || null,
            clanGradient: userClan?.colorGradient || null,
            hardestClassicLevel: (player as any).hardestClassicLevel || null,
            score: Math.round(score * 100) / 100,
            rankInProvince: 0,
            classicPp: player.classicPp || 0,
            platformerPp: player.platformerPp || 0,
            challengePp: player.challengePp || 0,
            creatorPoints: player.creatorPoints || 0,
            gdStars: player.gdStars || 0,
            gdMoons: player.gdMoons || 0,
            gdDemons: player.gdDemons || 0,
            activityPoints: player.activityPoints || 0,
          });
        }
      }
    }

    // Sắp xếp người chơi trong từng tỉnh theo điểm giảm dần và gán rankInProvince
    let nationalGrandTotal = 0;
    for (const prov of VN_PROVINCES) {
      provinceMap[prov].players.sort((a, b) => b.score - a.score);
      provinceMap[prov].players.forEach((p, idx) => {
        p.rankInProvince = idx + 1;
      });
      nationalGrandTotal += provinceMap[prov].totalScore;
    }

    // Sắp xếp các tỉnh theo tổng điểm giảm dần để xác định thứ hạng tỉnh
    const sortedProvinces = Object.keys(provinceMap)
      .map((prov) => ({
        province: prov,
        totalScore: provinceMap[prov].totalScore,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const maxScore = sortedProvinces[0]?.totalScore || 0;

    // Xác định Top 1, 2, 3 tỉnh
    const top1Province = sortedProvinces[0]?.totalScore > 0 ? sortedProvinces[0].province : null;
    const top2Province = sortedProvinces[1]?.totalScore > 0 ? sortedProvinces[1].province : null;
    const top3Province = sortedProvinces[2]?.totalScore > 0 ? sortedProvinces[2].province : null;

    // Kết quả trả về
    const resultProvinces: Record<
      string,
      {
        totalScore: number;
        percent: number;
        nationalRank: number;
        playerCount: number;
        topPlayer: any | null;
        players: any[];
        topStats?: any;
        hardestClassic?: { id: string; name: string; difficulty?: string | null; placement?: number | null } | null;
        clans?: Array<{ tag: string; color?: string | null; colorGradient?: string | null }>;
      }
    > = {};

    sortedProvinces.forEach((item, index) => {
      const pData = provinceMap[item.province];
      const percent =
        nationalGrandTotal > 0
          ? Math.round((pData.totalScore / nationalGrandTotal) * 1000) / 10
          : 0;

      // Tìm hardest classic của tỉnh (xét theo hardest của user trong tỉnh)
      let provHardest: any = null;
      const clanMap = new Map<string, { tag: string; color?: string | null; colorGradient?: string | null }>();

      for (const p of pData.players) {
        if (p.hardestClassicLevel) {
          if (!provHardest) {
            provHardest = p.hardestClassicLevel;
          } else {
            const curP = provHardest.placement ?? 999999;
            const newP = p.hardestClassicLevel.placement ?? 999999;
            if (newP < curP) {
              provHardest = p.hardestClassicLevel;
            }
          }
        }
        if (p.clanTag) {
          clanMap.set(p.clanTag, {
            tag: p.clanTag,
            color: p.clanColor || (p.clan as any)?.color || null,
            colorGradient: p.clanGradient || (p.clan as any)?.colorGradient || null,
          });
        }
      }

      resultProvinces[item.province] = {
        totalScore: Math.round(pData.totalScore * 100) / 100,
        percent,
        nationalRank: index + 1,
        playerCount: pData.players.length,
        topPlayer: pData.players[0] || null,
        players: pData.players,
        topStats: pData.topStats,
        hardestClassic: provHardest ? {
          id: provHardest.id,
          name: provHardest.name,
          difficulty: provHardest.difficulty,
          placement: provHardest.placement,
        } : null,
        clans: Array.from(clanMap.values()),
      };
    });

    const responsePayload = {
      success: true,
      mode,
      nationalGrandTotal: Math.round(nationalGrandTotal * 100) / 100,
      maxScore,
      top1Province,
      top2Province,
      top3Province,
      provinces: resultProvinces,
    };

    mapCache.set(cacheKey, { timestamp: now, data: responsePayload });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in /api/map:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
