import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';
import { refreshAllLevelBasePp } from '@/lib/upsertLevel';
import { recalculateAllUsersPp } from '@/lib/recordUtils';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const levelsUpdated = await refreshAllLevelBasePp();
    const usersRecalculated = await recalculateAllUsersPp();

    bustPublicCache(CACHE_TAGS.leaderboard, CACHE_TAGS.highlights, CACHE_TAGS.levels);
    clearLeaderboardCache();

    return NextResponse.json({
      success: true,
      levelsUpdated,
      usersRecalculated,
    });
  } catch (error: any) {
    return publicApiError(error, 'Không thể tính toán lại điểm hệ thống.', 500);
  }
}
