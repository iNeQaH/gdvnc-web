import { NextResponse } from 'next/server';
import { mapDifficultyFace, mapRatingType } from '@/lib/gdDifficulty';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(`gd:${getClientIp(_req)}`, 40, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid level ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://gdbrowser.com/api/level/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Level not found or GDBrowser is down' }, { status: 404 });
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      level: {
        gdLevelId: data.id,
        name: data.name,
        creatorName: data.author,
        difficulty: data.difficulty,
        difficultyFace: mapDifficultyFace(data.difficulty),
        ratingType: mapRatingType(data),
        isPlatformer: !!data.platformer,
        featured: data.featured,
        epic: data.epic,
        basePp: 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch level from GD servers' }, { status: 500 });
  }
}
