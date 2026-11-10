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

    // Đối với mode ACTIVITY tuần hiện tại ('this'):
    // Điểm số tăng liên tục theo thời gian thực khi người chơi cày stars/moons/demons.
    // Trả về trực tiếp không qua cachedJson và set no-store để không bị Cloudflare / Browser giữ cache cũ!
    if (mode === 'ACTIVITY' && week === 'this') {
      const leaderboard = await getActivityLeaderboard('this');
      return NextResponse.json(
        { success: true, leaderboard },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'CDN-Cache-Control': 'no-store',
            'Surrogate-Control': 'no-store',
          },
        }
      );
    }

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
      week === 'prev' ? 300 : 60
    );

    return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tải Bảng Xếp Hạng.', 500);
  }
}
