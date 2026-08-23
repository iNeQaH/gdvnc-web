import { NextResponse } from 'next/server';
import { mapDifficultyFace, mapRatingType } from '@/lib/gdDifficulty';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  if (!id) {
    return NextResponse.json({ error: 'Missing level ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://gdbrowser.com/api/level/${id}`);
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
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch level from GD servers' }, { status: 500 });
  }
}
