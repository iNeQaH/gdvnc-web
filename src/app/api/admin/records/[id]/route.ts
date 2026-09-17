import { publicApiError } from '@/lib/apiError';
import { requireAdmin } from '@/lib/auth';
import { clipReviewNote, notifyWithNote } from '@/lib/reviewNote';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { consolidateBeforeApprove, recalculateUserPp } from '@/lib/recordUtils';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { resolveStaffReviewerId } from '@/lib/reviewerDisplay';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, rejectReason, reviewerId: bodyReviewerId } = await req.json();
    const note = clipReviewNote(rejectReason);
    const reviewerId = await resolveStaffReviewerId(admin, bodyReviewerId);

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    }

    const record = await prisma.record.findUnique({
      where: { id },
      include: { level: true, user: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Không tìm thấy kỷ lục.' }, { status: 404 });
    }

    if (record.status !== RecordStatus.PENDING) {
      return NextResponse.json({ error: 'Submit này đã được xử lý.' }, { status: 400 });
    }

    let updatedRecord;
    await prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        const consolidation = await consolidateBeforeApprove(id, tx);
        if (!consolidation.ok) {
          throw new Error(consolidation.reason);
        }
      }

      const newStatus = action === 'APPROVE' ? RecordStatus.APPROVED : RecordStatus.REJECTED;

      updatedRecord = await tx.record.update({
        where: { id },
        data: {
          status: newStatus,
          rejectReason: note || (action === 'REJECT' ? 'Không đạt quy chuẩn bằng chứng.' : null),
          reviewerId,
          reviewedAt: new Date(),
        },
      });

      if (action === 'APPROVE') {
        await recalculateUserPp(record.userId, tx);

        if (record.userId) {
          await tx.notification.create({
            data: {
              userId: record.userId,
              title: 'Kỷ Lục Được Phê Duyệt',
              message: notifyWithNote(
                `Kỷ lục hoàn thành màn chơi "${record.level.name}" của bạn đã được Admin phê duyệt và cập nhật điểm Points vào Bảng Xếp Hạng!`,
                note
              ),
            },
          });
        }
      } else if (record.userId) {
        await tx.notification.create({
          data: {
            userId: record.userId,
            title: 'Kỷ Lục Bị Từ Chối',
            message: note || 'Không đạt quy chuẩn bằng chứng hoặc thiếu thông tin.',
          },
        });
      }
    });

    clearLeaderboardCache();

    if (record.userId) {
      try {
        const { appEventEmitter } = require('@/lib/eventEmitter');
        appEventEmitter.emit('notification', { userId: record.userId });
      } catch {}
    }

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi kiểm duyệt kỷ lục.', 500);
  }
}

export async function DELETE(req: Request, context: any) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const params = await context.params;
    const { id } = params;
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: 'Không tìm thấy kỷ lục.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.record.delete({ where: { id } });
      await recalculateUserPp(record.userId, tx);
    });

    clearLeaderboardCache();

    return NextResponse.json({ success: true, message: 'Đã xóa kỷ lục và cập nhật Points.' });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi server', 500);
  }
}
