import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { upsertLevelFromForm } from '@/lib/upsertLevel';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, rejectReason, reviewerId } = await req.json();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    }

    const submission = await prisma.levelSubmission.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!submission) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu thêm level.' }, { status: 404 });
    }

    if (action === 'REJECT') {
      const updated = await prisma.levelSubmission.update({
        where: { id },
        data: {
          status: RecordStatus.REJECTED,
          rejectReason: rejectReason || 'Không đạt quy chuẩn.',
          reviewerId: reviewerId || null,
          reviewedAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId: submission.userId,
          title: 'Submit Level bị từ chối',
          message: `Level ID ${submission.gdLevelId} đã bị từ chối. Lý do: ${rejectReason || 'Không xác định'}`,
        },
      });
      return NextResponse.json({ success: true, submission: updated });
    }

    const result = await upsertLevelFromForm({
      gdLevelId: submission.gdLevelId,
      videoUrl: submission.videoUrl || '',
      minPercent: submission.minPercent,
      placement: submission.placement,
      mode: submission.mode,
      isVN: submission.isVN,
      difficultyFace: submission.difficultyFace,
      ratingType: submission.ratingType,
    });

    const updated = await prisma.levelSubmission.update({
      where: { id },
      data: {
        status: RecordStatus.APPROVED,
        reviewerId: reviewerId || null,
        reviewedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: submission.userId,
        title: 'Submit Level đã được duyệt',
        message: `Level "${result.name}" (ID ${submission.gdLevelId}) đã được thêm vào danh sách.`,
      },
    });

    return NextResponse.json({ success: true, submission: updated, level: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý submit level' }, { status: 500 });
  }
}
