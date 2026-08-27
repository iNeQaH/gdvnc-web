import { NextResponse } from 'next/server';
import {
  getCachedLeaderboard,
  getCreatorLeaderboard,
  getPlayerLeaderboard,
  setCachedLeaderboard,
} from '@/lib/leaderboard';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const cached = getCachedLeaderboard(mode);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    const leaderboard =
      mode === 'CREATOR'
        ? await getCreatorLeaderboard()
        : await getPlayerLeaderboard(mode === 'PLATFORMER' ? 'PLATFORMER' : 'CLASSIC');

    const body = { success: true, leaderboard };
    setCachedLeaderboard(mode, body);
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Bảng Xếp Hạng.' }, { status: 500 });
  }
}
