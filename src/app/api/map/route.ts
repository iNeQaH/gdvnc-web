import { NextResponse } from 'next/server';
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
    const mode = (searchParams.get('mode') || 'CLASSIC').toUpperCase();

    const cacheKey = `map:${mode}`;
    const cached = mapCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

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

    // Helper extract player score according to mode
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
          clanTag?: string | null;
          score: number;
          rankInProvince: number;
        }>;
      }
    > = {};

    for (const prov of VN_PROVINCES) {
      provinceMap[prov] = {
        totalScore: 0,
        players: [],
      };
    }

    // Phân loại người chơi vào các tỉnh
    for (const player of rawLeaderboard) {
      const score = getScore(player);
      if (score <= 0) continue;

      const prov = extractProvinceFromLocation(player.country);
      if (prov && provinceMap[prov]) {
        provinceMap[prov].totalScore += score;
        provinceMap[prov].players.push({
          id: player.id || player.userId || player.username,
          username: player.username || '',
          displayName: player.displayName || player.gdUsername || player.username || 'User',
          avatarUrl: player.avatarUrl || null,
          nameColor: player.nameColor || null,
          nameGradient: player.nameGradient || null,
          nameGlow: player.nameGlow || null,
          clanTag: player.clan?.tag || player.clanMember?.clan?.tag || null,
          score,
          rankInProvince: 0,
        });
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
      }
    > = {};

    sortedProvinces.forEach((item, index) => {
      const pData = provinceMap[item.province];
      const percent =
        nationalGrandTotal > 0
          ? Math.round((pData.totalScore / nationalGrandTotal) * 1000) / 10
          : 0;

      resultProvinces[item.province] = {
        totalScore: Math.round(pData.totalScore * 100) / 100,
        percent,
        nationalRank: index + 1,
        playerCount: pData.players.length,
        topPlayer: pData.players[0] || null,
        players: pData.players,
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
