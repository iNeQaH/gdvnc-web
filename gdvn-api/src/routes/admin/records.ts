import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import prisma from '../../db';
import { RecordStatus } from '@prisma/client';
import { consolidateBeforeApprove, recalculateUserPp } from '../../services/recordUtils';
import { clearLeaderboardCache } from '../../services/leaderboard';
import { clipReviewNote, notifyWithNote } from '../../services/reviewNote';
import { ADMIN_LIST_LIMIT, parsePageParam, parseQueueStatusParam, queueFilterTotal } from '../../services/adminQueue';
import { REVIEWER_SELECT, reviewerNameFrom, resolveStaffReviewerId } from '../../services/reviewerDisplay';
import { placeholderVideoWhere, isPlaceholderRecordVideo } from '../../services/placeholderRecordVideo';

const router = Router();

router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const status = parseQueueStatusParam(req.query.status as string || null);
    const page = parsePageParam(req.query.page as string || null);
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [records, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.record.findMany({
        where: status ? { status } : {},
        include: {
          user: { select: { id: true, username: true, gdUsername: true, avatarUrl: true } },
          level: true,
          reviewer: { select: REVIEWER_SELECT },
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
        skip,
        take: ADMIN_LIST_LIMIT,
      }),
      prisma.record.count({ where: { status: RecordStatus.PENDING } }),
      prisma.record.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.record.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    const counts = {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };

    res.json({
      success: true,
      records: records.map((record) => ({
        ...record,
        reviewerName: reviewerNameFrom(record.reviewer),
      })),
      counts,
      page,
      limit: ADMIN_LIST_LIMIT,
      total: queueFilterTotal(counts, status),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải danh sách kỷ lục.' });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { action, rejectReason, reviewerId: bodyReviewerId } = req.body;
    const note = clipReviewNote(rejectReason);
    const reviewerId = await resolveStaffReviewerId(admin, bodyReviewerId);

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Hành động không hợp lệ.' });
    }

    const record = await prisma.record.findUnique({
      where: { id },
      include: { level: true, user: true },
    });

    if (!record) {
      return res.status(404).json({ error: 'Không tìm thấy kỷ lục.' });
    }

    if (record.status !== RecordStatus.PENDING) {
      return res.status(400).json({ error: 'Submit này đã được xử lý.' });
    }

    if (action === 'APPROVE') {
      const consolidation = await consolidateBeforeApprove(id);
      if (!consolidation.ok) {
        return res.status(400).json({ error: consolidation.reason });
      }
    }

    const newStatus = action === 'APPROVE' ? RecordStatus.APPROVED : RecordStatus.REJECTED;

    const updatedRecord = await prisma.record.update({
      where: { id },
      data: {
        status: newStatus,
        rejectReason: note || (action === 'REJECT' ? 'Không đạt quy chuẩn bằng chứng.' : null),
        reviewerId,
        reviewedAt: new Date(),
      },
    });

    if (action === 'APPROVE') {
      await recalculateUserPp(record.userId);

      if (record.userId) {
        await prisma.notification.create({
          data: {
            userId: record.userId,
            title: 'Kỷ Lục Được Phê Duyệt',
            message: notifyWithNote(
              \Kỷ lục hoàn thành màn chơi "\" của bạn đã được Admin phê duyệt và cập nhật điểm Points vào Bảng Xếp Hạng!\,
              note
            ),
          },
        });
      }
    } else if (record.userId) {
      await prisma.notification.create({
        data: {
          userId: record.userId,
          title: 'Kỷ Lục Bị Từ Chối',
          message: \Kỷ lục màn chơi "\" của bạn đã bị từ chối với lý do: "\"\,
        },
      });
    }

    res.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi kiểm duyệt kỷ lục.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Không tìm thấy kỷ lục.' });

    await prisma.record.delete({ where: { id } });
    await recalculateUserPp(record.userId);
    clearLeaderboardCache();

    res.json({ success: true, message: 'Đã xóa kỷ lục và cập nhật Points.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.post('/cleanup-placeholder', requireAdmin, async (req, res) => {
  try {
    const candidates = await prisma.record.findMany({
      where: placeholderVideoWhere(),
      select: { id: true, userId: true, videoUrl: true },
    });
    const ids = candidates.filter((r) => isPlaceholderRecordVideo(r.videoUrl)).map((r) => r.id);
    const userIds = [
      ...new Set(candidates.filter((r) => ids.includes(r.id) && r.userId).map((r) => r.userId as string)),
    ];

    if (ids.length > 0) {
      await prisma.record.deleteMany({ where: { id: { in: ids } } });
      await Promise.all(userIds.map((id) => recalculateUserPp(id)));
    }

    clearLeaderboardCache();
    res.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi dọn kỷ lục giả.' });
  }
});

export default router;
