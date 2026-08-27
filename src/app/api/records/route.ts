import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`records:${auth.userId}`, 12, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json();
    const { gdLevelId, levelName, creatorName, isPlatformer, progress, timeMs, videoUrl, rawProofUrl, hz, fps, device, comment } = body;

    if (!gdLevelId || !isHttpsUrl(videoUrl)) {
      return NextResponse.json({ error: 'Vui lòng điền ID màn chơi và link video HTTPS.' }, { status: 400 });
    }

    let level = await prisma.level.findUnique({
      where: { gdLevelId: parseInt(gdLevelId, 10) }
    });

    if (!level) {
      level = await prisma.level.create({
        data: {
          gdLevelId: parseInt(gdLevelId, 10),
          name: clipText(levelName, 120) || 'Unknown Level',
          creatorName: clipText(creatorName, 80) || 'Unknown',
          mode: isPlatformer ? 'PLATFORMER' : 'CLASSIC',
          difficulty: 'Unrated',
          basePp: 0,
          placement: null
        }
      });
    }

    const record = await prisma.record.create({
      data: {
        userId: auth.userId,
        levelId: level.id,
        progress: progress ? parseInt(progress, 10) : null,
        timeMs: timeMs ? parseInt(timeMs, 10) : null,
        videoUrl: clipText(videoUrl, 500),
        rawProofUrl: isHttpsUrl(rawProofUrl) ? clipText(rawProofUrl, 500) : null,
        hz: hz ? parseInt(hz, 10) : 60,
        fps: fps ? parseInt(fps, 10) : null,
        device: clipText(device, 40) || 'PC',
        comment: clipText(comment, 1000) || null,
        status: RecordStatus.PENDING,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi gửi kỷ lục.' }, { status: 500 });
  }
}
