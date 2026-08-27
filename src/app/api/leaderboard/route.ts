import { NextResponse } from 'next/server';
import { getCreatorLeaderboard, getPlayerLeaderboard } from '@/lib/leaderboard';

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'CLASSIC';
    const cached = cache.get(mode);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json(cached.body, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    const leaderboard =
      mode === 'CREATOR'
        ? await getCreatorLeaderboard()
        : await getPlayerLeaderboard(mode === 'PLATFORMER' ? 'PLATFORMER' : 'CLASSIC');

    const body = { success: true, leaderboard };
    cache.set(mode, { at: Date.now(), body });
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải Bảng Xếp Hạng.' }, { status: 500 });
  }
}
