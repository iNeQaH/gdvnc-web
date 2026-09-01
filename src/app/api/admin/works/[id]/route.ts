import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { extractYoutubeId, upsertLevelFromForm } from '@/lib/upsertLevel';
import { purgeWorkImages } from '@/lib/workImages';
import { clipReviewNote, notifyWithNote } from '@/lib/reviewNote';
import { gdNamesEqual } from '@/lib/gdName';

async function finalizeWorkImages(workId: string, imageUrl: string | null | undefined) {
  await purgeWorkImages(imageUrl);
  await prisma.creatorWork.update({
    where: { id: workId },
    data: { imageUrl: null },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, rejectReason, badgeId, cpAwarded } = await req.json();
    const note = clipReviewNote(rejectReason);

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    }

    const work = await prisma.creatorWork.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        username: true,
        gdLevelId: true,
        videoUrl: true,
        imageUrl: true,
        levelName: true,
        status: true,
        user: { select: { gdUsername: true, creatorPoints: true } },
      },
    });

    if (!work) return NextResponse.json({ error: 'Không tìm thấy Work.' }, { status: 404 });

    if (work.status !== RecordStatus.PENDING) {
      return NextResponse.json({ error: 'Submit này đã được xử lý.' }, { status: 400 });
    }

    if (action === 'REJECT') {
      const updated = await prisma.creatorWork.update({
        where: { id },
        data: {
          status: RecordStatus.REJECTED,
          rejectReason: note || 'Không đạt quy chuẩn Creator.',
          reviewedAt: new Date(),
          reviewerId: admin.userId,
          imageUrl: null,
        }
      });

      await purgeWorkImages(work.imageUrl);

      await prisma.notification.create({
        data: {
          userId: work.userId,
          title: 'Tác Phẩm Bị Từ Chối',
          message: `Tác phẩm "${work.levelName}" của bạn đã bị từ chối. Lý do: ${note || 'Không xác định'}`
        }
      });

      return NextResponse.json({ success: true, work: { ...updated, imageUrl: null } });
    }

    if (work.gdLevelId) {
      const existingLevel = await prisma.level.findUnique({
        where: { gdLevelId: work.gdLevelId },
        select: { id: true, youtubeId: true },
      });
      if (existingLevel) {
        const youtubeId = extractYoutubeId(work.videoUrl);
        if (youtubeId && youtubeId !== existingLevel.youtubeId) {
          await prisma.level.update({
            where: { id: existingLevel.id },
            data: { youtubeId },
          });
        }
      } else {
        await upsertLevelFromForm({
          gdLevelId: work.gdLevelId,
          videoUrl: work.videoUrl || '',
          placement: null,
        });
      }
    }

    const ownWork = gdNamesEqual(work.username, work.user.gdUsername);
    const badgeIds = ownWork && typeof badgeId === 'string' ? badgeId.split(',').filter(Boolean) : [];
    const extraCp = ownWork ? Number.parseFloat(cpAwarded || '0') || 0 : 0;

    const updated = await prisma.creatorWork.update({
      where: { id },
      data: {
        status: RecordStatus.APPROVED,
        rejectReason: note || null,
        badgeGranted: badgeIds.join(','),
        cpGranted: extraCp,
        reviewedAt: new Date(),
        reviewerId: admin.userId,
        imageUrl: null,
      }
    });

    await purgeWorkImages(work.imageUrl);

    for (const bId of badgeIds) {
      const existingBadge = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: work.userId, badgeId: bId } }
      });
      if (!existingBadge) {
        await prisma.userBadge.create({
          data: { userId: work.userId, badgeId: bId }
        });
      }
    }

    let totalCp = work.user.creatorPoints || 0;
    if (extraCp) {
      const bumped = await prisma.user.update({
        where: { id: work.userId },
        data: { creatorPoints: { increment: extraCp } },
        select: { creatorPoints: true },
      });
      totalCp = bumped.creatorPoints;
    }

    const grantedBadges = badgeIds.length
      ? await prisma.badge.findMany({ where: { id: { in: badgeIds } } })
      : [];
    const badgeNames = grantedBadges.map((b) => b.name).join(', ') || 'Creator';

    await prisma.notification.create({
      data: {
        userId: work.userId,
        title: 'Tác Phẩm Được Phê Duyệt!',
        message: notifyWithNote(
          `Tác phẩm "${work.levelName}" của bạn đã được phê duyệt! Huy hiệu: ${badgeNames}. Tổng CP hiện tại: ${totalCp}.`,
          note
        )
      }
    });

    return NextResponse.json({ success: true, work: { ...updated, imageUrl: null } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý Work' }, { status: 500 });
  }
}
