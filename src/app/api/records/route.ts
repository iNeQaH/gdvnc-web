import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function POST(req: Request) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const { username, gdLevelId, levelName, creatorName, isPlatformer, progress, timeMs, videoUrl, rawProofUrl, hz, fps, device, comment } = body;

    if (!username || !gdLevelId || !videoUrl) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ tên người chơi, ID màn chơi và link video.' }, { status: 400 });
    }

    // Find or create player
    let user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          country: 'Vietnam',
        },
      });
    }

    // Find or create level based on gdLevelId
    let level = await prisma.level.findUnique({
      where: { gdLevelId: parseInt(gdLevelId, 10) }
    });

    if (!level) {
      level = await prisma.level.create({
        data: {
          gdLevelId: parseInt(gdLevelId, 10),
          name: levelName || 'Unknown Level',
          creatorName: creatorName || 'Unknown',
          mode: isPlatformer ? 'PLATFORMER' : 'CLASSIC',
          difficulty: 'Unrated',
          basePp: 0,
          placement: null
        }
      });
    }

    // Create pending record
    const record = await prisma.record.create({
      data: {
        userId: user.id,
        levelId: level.id,
        progress: progress ? parseInt(progress, 10) : null,
        timeMs: timeMs ? parseInt(timeMs, 10) : null,
        videoUrl,
        rawProofUrl: rawProofUrl || null,
        hz: hz ? parseInt(hz, 10) : 60,
        fps: fps ? parseInt(fps, 10) : null,
        device: device || 'PC',
        comment: comment || null,
        status: RecordStatus.PENDING,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi gửi kỷ lục.' }, { status: 500 });
  }
}
