import { publicApiError } from '@/lib/apiError';
import { NextResponse } from 'next/server';
import {
  getCreatorLeaderboard,
  getPlayerLeaderboard,
  getStatLeaderboard,
  getActivityLeaderboard,
} from '@/lib/leaderboard';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import {
  getLeaderboardMemoryCache,
  setLeaderboardMemoryCache,
  getLeaderboardVersion,
  coalesceLeaderboardQuery,
} from '@/lib/leaderboardMemoryCache';

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'CLASSIC').toUpperCase();
    const deviceParam = searchParams.get('device');
    const device = deviceParam === 'PC' || deviceParam === 'MOBILE' ? deviceParam : 'ALL';
    const week = searchParams.get('week') === 'prev' ? 'prev' : 'this';

    const cacheKey = `lb:${mode}:${device}:${week}`;
    const version = getLeaderboardVersion();
    const etag = `W/"lb-${version}-${mode}-${device}-${week}"`;

    // 1. Kiểm tra ETag: Nếu dữ liệu chưa đổi, trả về 304 Not Modified tức thì (<0.02ms, 0 byte transfer)
    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag && clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'CDN-Cache-Control': 'no-cache',
        },
      });
    }

    // 2. Event-Driven RAM Cache: Đọc thẳng từ RAM của Node.js process trong <0.05ms, 0 query DB
    let body = getLeaderboardMemoryCache<{ success: true; leaderboard: any[] }>(cacheKey);

    if (!body) {
      // Gom nhóm promise để chống stampede nếu nhiều request vào đồng thời
      body = await coalesceLeaderboardQuery(cacheKey, async () => {
        if (mode === 'CREATOR') {
          const leaderboard = await getCreatorLeaderboard();
          return { success: true, leaderboard };
        }
        if (mode === 'STARS') {
          const leaderboard = await getStatLeaderboard('stars');
          return { success: true, leaderboard };
        }
        if (mode === 'MOONS') {
          const leaderboard = await getStatLeaderboard('moons');
          return { success: true, leaderboard };
        }
        if (mode === 'DEMONS') {
          const leaderboard = await getStatLeaderboard('demons');
          return { success: true, leaderboard };
        }
        if (mode === 'ACTIVITY') {
          const leaderboard = await getActivityLeaderboard(week);
          return { success: true, leaderboard };
        }

        const playerMode =
          mode === 'PLATFORMER' ? 'PLATFORMER' : mode === 'CHALLENGE' ? 'CHALLENGE' : 'CLASSIC';
        const leaderboard = await getPlayerLeaderboard(playerMode, device);
        return { success: true, leaderboard };
      });

      setLeaderboardMemoryCache(cacheKey, body);
    }

    // 3. Trả về kèm header must-revalidate để Cloudflare/Browser luôn kiểm tra ETag siêu tốc (<0.05ms)
    // Tuyệt đối không bị kẹt cache cứng vài tiếng như trước!
    return NextResponse.json(body, {
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-cache',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tải Bảng Xếp Hạng.', 500);
  }
}
