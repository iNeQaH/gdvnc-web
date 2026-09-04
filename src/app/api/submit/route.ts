import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { getClientIp } from '@/lib/requestIp';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { clipText, isHttpsUrl } from '@/lib/validate';
import { estimateDataUrlBytes } from '@/lib/profileEmbed';
import { storeDataUrlAsImage } from '@/lib/workImages';
import { isAllowedImageRef } from '@/lib/uploadthing';
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
      select: { id: true, username: true, gdUsername: true },
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
          hz: hz === '' || hz == null ? 60 : parseInt(String(hz), 10) || 60,
          fps: fps === '' || fps == null || Number.isNaN(Number(fps)) ? null : parseInt(String(fps), 10),
          device: clipText(device, 40) || 'PC',
          comment: clipText(comment, 1000) || null,
          status: RecordStatus.PENDING,
          prioritySp: 0,
        },
      });

      return NextResponse.json({ success: true, record });
    } else if (type === 'CREATOR') {
      const gdIdRaw = parseInt(String(data.gdLevelId ?? ''), 10);
      const hasId = Number.isFinite(gdIdRaw) && gdIdRaw > 0;
      const description = clipText(data.description, 4000);
      const levelName = clipText(data.levelName, 120);

      let storedImage: string | null = null;
      const refs: string[] = [];
      const incoming = [
        ...(typeof data.imageUrl === 'string' ? [data.imageUrl] : []),
        ...(Array.isArray(data.imageUrls) ? data.imageUrls : []),
      ];
      for (const item of incoming) {
        if (typeof item !== 'string' || !item.trim()) continue;
        if (item.startsWith('data:image/')) {
          if (estimateDataUrlBytes(item) > 4 * 1024 * 1024) {
            return NextResponse.json({ error: 'Ảnh work vượt quá 4MB.' }, { status: 400 });
          }
          refs.push(await storeDataUrlAsImage(item));
        } else if (isAllowedImageRef(item)) {
          refs.push(clipText(item, 500));
        }
        if (refs.length >= 3) break;
      }
      storedImage = refs.length > 0 ? [...new Set(refs)].join(',') : null;

      if (!hasId && !description && !storedImage) {
        return NextResponse.json(
          { error: 'Cần Level ID, hoặc mô tả / ảnh minh họa.' },
          { status: 400 }
        );
      }

      if (hasId) {
        await prisma.levelSubmission.deleteMany({
          where: { userId, gdLevelId: gdIdRaw, status: RecordStatus.PENDING },
        });
      }

      const submittedGd = clipText(data.username, 80) || user.gdUsername || user.username;
      const work = await prisma.creatorWork.create({
        data: {
          userId,
          username: submittedGd,
          levelName: levelName || (hasId ? `Level ${gdIdRaw}` : description?.slice(0, 80) || 'Work'),
          gdLevelId: hasId ? gdIdRaw : null,
          videoUrl: isHttpsUrl(data.videoUrl) ? clipText(data.videoUrl, 500) : null,
          imageUrl: storedImage,
          description: description || null,
          minPercent: data.minPercent ? parseInt(String(data.minPercent), 10) : 100,
          placement: data.placement ? parseInt(String(data.placement), 10) : null,
          vnPlacement: data.vnPlacement ? parseInt(String(data.vnPlacement), 10) : null,
          mode: data.mode === 'PLATFORMER' ? 'PLATFORMER' : 'CLASSIC',
          isVN: !!data.isVN,
          isChallenge: !!data.isChallenge,
          difficultyFace: data.difficultyFace !== undefined ? parseInt(String(data.difficultyFace), 10) : 10,
          ratingType: clipText(data.ratingType, 20) || 'NONE',
          status: RecordStatus.PENDING,
          prioritySp: 0,
        }
      });

      return NextResponse.json({ success: true, work });
    } else if (type === 'LEVEL') {
      const { gdLevelId, videoUrl, minPercent, placement, vnPlacement, mode, isVN, isChallenge, difficultyFace, ratingType } = data;
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
          vnPlacement: vnPlacement ? parseInt(String(vnPlacement), 10) : null,
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
