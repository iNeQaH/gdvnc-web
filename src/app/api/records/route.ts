import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getOrCreateStubLevel } from '@/lib/upsertLevel';
import { publicApiError } from '@/lib/apiError';
import {
  parseSubmitFps,
  parseSubmitGdLevelId,
  parseSubmitHz,
  parseSubmitProgress,
  parseSubmitTimeMs,
} from '@/lib/submitValidation';

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
    const {
      gdLevelId,
      levelName,
      creatorName,
      isPlatformer,
      progress,
      timeMs,
      videoUrl,
      rawProofUrl,
      hz,
      fps,
      device,
      comment,
    } = body;

    const parsedGdId = parseSubmitGdLevelId(gdLevelId);
    if (!parsedGdId || !isHttpsUrl(videoUrl)) {
      return NextResponse.json({ error: 'Vui lòng điền ID màn chơi và link video HTTPS.' }, { status: 400 });
    }

    const parsedProgress = parseSubmitProgress(progress);
    if (progress != null && progress !== '' && parsedProgress === null) {
      return NextResponse.json({ error: 'Progress phải từ 0 đến 100.' }, { status: 400 });
    }
    const parsedTimeMs = parseSubmitTimeMs(timeMs);
    if (timeMs != null && timeMs !== '' && parsedTimeMs === null) {
      return NextResponse.json({ error: 'Thời gian không hợp lệ.' }, { status: 400 });
    }
    const parsedFps = parseSubmitFps(fps);
    if (fps != null && fps !== '' && parsedFps === null) {
      return NextResponse.json({ error: 'FPS không hợp lệ.' }, { status: 400 });
    }

    const level = await getOrCreateStubLevel({
      gdLevelId: parsedGdId,
      name: clipText(levelName, 120) || 'Unknown Level',
      creatorName: clipText(creatorName, 80) || 'Unknown',
      isPlatformer: !!isPlatformer,
    });

    const duplicate = await prisma.record.findFirst({
      where: {
        userId: auth.userId,
        levelId: level.id,
        status: RecordStatus.PENDING,
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: 'Bạn đã có kỷ lục đang chờ duyệt cho màn chơi này.' },
        { status: 409 }
      );
    }

    const record = await prisma.record.create({
      data: {
        userId: auth.userId,
        levelId: level.id,
        progress: parsedProgress,
        timeMs: parsedTimeMs,
        videoUrl: clipText(videoUrl, 500),
        rawProofUrl: isHttpsUrl(rawProofUrl) ? clipText(rawProofUrl, 500) : null,
        hz: parseSubmitHz(hz),
        fps: parsedFps,
        device: clipText(device, 40) || 'PC',
        comment: clipText(comment, 1000) || null,
        status: RecordStatus.PENDING,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: unknown) {
    return publicApiError(error, 'Lỗi khi gửi kỷ lục.');
  }
}
