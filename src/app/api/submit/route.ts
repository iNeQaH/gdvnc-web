import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export async function POST(req: Request) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();
    const { type, ...data } = body;

    // Must be logged in, so we assume client passes valid userId
    const { userId } = data;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng.' }, { status: 404 });

    if (type === 'PLAYER') {
      const { gdLevelId, levelName, creatorName, isPlatformer, progress, timeMs, videoUrl, rawProofUrl, hz, fps, device, comment } = data;

      if (!gdLevelId || !videoUrl) {
        return NextResponse.json({ error: 'Vui lòng điền ID màn chơi và link video.' }, { status: 400 });
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
          userId,
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
          prioritySp: 0,
        },
      });

      return NextResponse.json({ success: true, record });
    } else if (type === 'CREATOR') {
      const { levelName, gdLevelId, videoUrl, imageUrl, description } = data;

      if (!levelName) {
        return NextResponse.json({ error: 'Vui lòng điền tên Work / Tác phẩm.' }, { status: 400 });
      }

      const work = await prisma.creatorWork.create({
        data: {
          userId,
          username: data.username || user.username,
          levelName,
          gdLevelId: gdLevelId ? parseInt(gdLevelId, 10) : null,
          videoUrl: videoUrl || null,
          imageUrl: imageUrl || null,
          description: description || null,
          status: RecordStatus.PENDING,
          prioritySp: 0,
        }
      });

      return NextResponse.json({ success: true, work });
    } else if (type === 'LEVEL') {
      const { gdLevelId, videoUrl, minPercent, placement, mode, isVN, difficultyFace, ratingType } = data;
      if (!gdLevelId) {
        return NextResponse.json({ error: 'Vui lòng điền Level ID.' }, { status: 400 });
      }

      const submission = await prisma.levelSubmission.create({
        data: {
          userId,
          gdLevelId: parseInt(gdLevelId, 10),
          videoUrl: videoUrl || null,
          minPercent: minPercent ? parseInt(String(minPercent), 10) : 100,
          placement: placement ? parseInt(String(placement), 10) : null,
          mode: mode || 'CLASSIC',
          isVN: !!isVN,
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
