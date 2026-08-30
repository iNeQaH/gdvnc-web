import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { estimateDataUrlBytes } from '@/lib/profileEmbed';
import { storeDataUrlAsImage } from '@/lib/workImages';
import { getOrCreateStubLevel } from '@/lib/upsertLevel';

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = rateLimit(`submit:${auth.userId}`, 12, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json();
    const { type, ...data } = body;
    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng.' }, { status: 404 });

    if (type === 'PLAYER') {
      const { gdLevelId, levelName, creatorName, isPlatformer, progress, timeMs, videoUrl, rawProofUrl, hz, fps, device, comment } = data;

      if (!gdLevelId || !isHttpsUrl(videoUrl)) {
        return NextResponse.json({ error: 'Vui lòng điền ID màn chơi và link video HTTPS.' }, { status: 400 });
      }

      const level = await getOrCreateStubLevel({
        gdLevelId: parseInt(gdLevelId, 10),
        name: clipText(levelName, 120) || 'Unknown Level',
        creatorName: clipText(creatorName, 80) || 'Unknown',
        isPlatformer: !!isPlatformer,
      });

      const record = await prisma.record.create({
        data: {
          userId,
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
          prioritySp: 0,
        },
      });

      return NextResponse.json({ success: true, record });
    } else if (type === 'CREATOR') {
      const { levelName, gdLevelId, videoUrl, imageUrl, description } = data;

      if (!levelName) {
        return NextResponse.json({ error: 'Vui lòng điền tên Work / Tác phẩm.' }, { status: 400 });
      }

      let storedImage: string | null = null;
      const blobs: string[] = [];
      if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) blobs.push(imageUrl);
      if (Array.isArray(data.imageUrls)) {
        for (const item of data.imageUrls) {
          if (typeof item === 'string' && item.startsWith('data:image/')) blobs.push(item);
        }
      }

      if (blobs.length > 0) {
        if (estimateDataUrlBytes(blobs[0]) > 4 * 1024 * 1024) {
          return NextResponse.json({ error: 'Ảnh work vượt quá 4MB.' }, { status: 400 });
        }
        const refs: string[] = [];
        for (const blob of blobs.slice(0, 3)) {
          if (estimateDataUrlBytes(blob) > 4 * 1024 * 1024) continue;
          refs.push(await storeDataUrlAsImage(blob));
        }
        storedImage = refs.join(',') || null;
      } else if (typeof imageUrl === 'string' && imageUrl.startsWith('/api/images/')) {
        storedImage = clipText(imageUrl, 200);
      }

      const work = await prisma.creatorWork.create({
        data: {
          userId,
          username: user.username,
          levelName: clipText(levelName, 120),
          gdLevelId: gdLevelId ? parseInt(gdLevelId, 10) : null,
          videoUrl: isHttpsUrl(videoUrl) ? clipText(videoUrl, 500) : null,
          imageUrl: storedImage,
          description: clipText(description, 4000) || null,
          status: RecordStatus.PENDING,
          prioritySp: 0,
        }
      });

      return NextResponse.json({ success: true, work });
    } else if (type === 'LEVEL') {
      const { gdLevelId, videoUrl, minPercent, placement, mode, isVN, isChallenge, difficultyFace, ratingType } = data;
      if (!gdLevelId) {
        return NextResponse.json({ error: 'Vui lòng điền Level ID.' }, { status: 400 });
      }

      const submission = await prisma.levelSubmission.create({
        data: {
          userId,
          gdLevelId: parseInt(gdLevelId, 10),
          videoUrl: isHttpsUrl(videoUrl) ? clipText(videoUrl, 500) : null,
          minPercent: minPercent ? parseInt(String(minPercent), 10) : 100,
          placement: placement ? parseInt(String(placement), 10) : null,
          mode: mode || 'CLASSIC',
          isVN: !!isVN,
          isChallenge: !!isChallenge,
          difficultyFace: difficultyFace !== undefined ? parseInt(String(difficultyFace), 10) : 10,
          ratingType: ratingType || 'NONE',
          status: RecordStatus.PENDING,
          prioritySp: 0,
        },
      });

      return NextResponse.json({ success: true, submission });
    }

    return NextResponse.json({ error: 'Invalid submit type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi gửi.' }, { status: 500 });
  }
}
