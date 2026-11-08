import { publicApiError } from '@/lib/apiError';
import { NextResponse } from 'next/server';
import { getCreatorLeaderboard, getPlayerLeaderboard, getStatLeaderboard, getActivityLeaderboard } from '@/lib/leaderboard';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'CLASSIC').toUpperCase();
    const deviceParam = searchParams.get('device');
    const device = deviceParam === 'PC' || deviceParam === 'MOBILE' ? deviceParam : 'ALL';
    const week = searchParams.get('week') === 'prev' ? 'prev' : 'this';

    const body = await cachedJson(
      async () => {
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
      },
      ['leaderboard-v5', mode, device, week],
      [CACHE_TAGS.leaderboard],
      300
    );

    return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tải Bảng Xếp Hạng.', 500);
  }
}
