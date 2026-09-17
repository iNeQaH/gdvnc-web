import { publicApiError } from '@/lib/apiError';
import { NextResponse } from 'next/server';
import { getCreatorLeaderboard, getPlayerLeaderboard } from '@/lib/leaderboard';
import { checkSiteLockAndBlock } from '@/lib/siteLock';
import { cachedJson, CACHE_TAGS, PUBLIC_CACHE_HEADERS } from '@/lib/publicCache';

export async function GET(req: Request) {
  const block = await checkSiteLockAndBlock();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const body = await cachedJson(
      async () => {
        const leaderboard =
          mode === 'CREATOR'
            ? await getCreatorLeaderboard()
            : await getPlayerLeaderboard(mode === 'PLATFORMER' ? 'PLATFORMER' : 'CLASSIC');
        return { success: true, leaderboard };
      },
      ['leaderboard', mode],
      [CACHE_TAGS.leaderboard],
      300
    );

    return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tải Bảng Xếp Hạng.', 500);
  }
}
