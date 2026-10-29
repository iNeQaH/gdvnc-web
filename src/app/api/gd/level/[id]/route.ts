import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { mapDifficultyFace, mapRatingType, pickGdCreatorName, pickGdLevelName } from '@/lib/gdDifficulty';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { fetchGdLevel } from '@/lib/boomlings';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(`gd:${getClientIp(_req)}`, 40, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid level ID' }, { status: 400 });
  }

  try {
    const data = await fetchGdLevel(Number(id));
    if (!data) {
      return NextResponse.json({ error: "Can't fetch level, please submit manually" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      level: {
        gdLevelId: data.id,
        name: pickGdLevelName(data),
        creatorName: pickGdCreatorName(data) || null,
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
