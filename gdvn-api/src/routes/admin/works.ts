import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import prisma from '../../db';
import { RecordStatus } from '@prisma/client';
import { upsertLevelFromForm } from '../../services/data/upsertLevel';
import { purgeWorkImages } from '../../services/uploadthing';
import { clipReviewNote, notifyWithNote } from '../../services/reviewNote';
import { resolveStaffReviewerId } from '../../services/reviewerDisplay';
import { ADMIN_LIST_LIMIT, parsePageParam, parseQueueStatusParam, queueFilterTotal } from '../../services/adminQueue';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const status = parseQueueStatusParam(req.query.status as string || null);
    const page = parsePageParam(req.query.page as string || null);
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [works, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.creatorWork.findMany({
        where: status ? { status } : {},
        include: {
          user: { select: { id: true, username: true, gdUsername: true, avatarUrl: true } },
          reviewer: { select: { id: true, username: true, gdUsername: true } },
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
        skip,
        take: ADMIN_LIST_LIMIT,
      }),
      prisma.creatorWork.count({ where: { status: RecordStatus.PENDING } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    const counts = { pending: pendingCount, approved: approvedCount, rejected: rejectedCount };
    res.json({ success: true, works, counts, page, limit: ADMIN_LIST_LIMIT, total: queueFilterTotal(counts, status) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { action, rejectReason, badgeId, cpAwarded, reviewerId: bodyReviewerId } = req.body;
    const note = clipReviewNote(rejectReason);
    const reviewerId = await resolveStaffReviewerId(admin, bodyReviewerId);

    if (!['APPROVE', 'REJECT'].includes(action)) return res.status(400).json({ error: 'Hành động không hợp lệ.' });

    const work = await prisma.creatorWork.findUnique({
      where: { id },
      include: { user: { select: { gdUsername: true, creatorPoints: true } } },
    });

    if (!work) return res.status(404).json({ error: 'Không tìm thấy Work.' });
    if (work.status !== RecordStatus.PENDING) return res.status(400).json({ error: 'Submit này đã được xử lý.' });

    if (action === 'REJECT') {
      const updated = await prisma.creatorWork.update({
        where: { id },
        data: { status: RecordStatus.REJECTED, rejectReason: note || 'Không đạt quy chuẩn Creator.', reviewedAt: new Date(), reviewerId, imageUrl: null }
      });
      res.json({ success: true, work: updated });
      return;
    }

    const ownWork = (work.username && work.user.gdUsername && work.username.toLowerCase() === work.user.gdUsername.toLowerCase());
    const badgeIds = ownWork && typeof badgeId === 'string' ? badgeId.split(',').filter(Boolean) : [];
    const extraCp = ownWork ? parseFloat(cpAwarded || '0') || 0 : 0;

    const updated = await prisma.creatorWork.update({
      where: { id },
      data: { status: RecordStatus.APPROVED, rejectReason: note || null, badgeGranted: badgeIds.join(','), cpGranted: extraCp, reviewedAt: new Date(), reviewerId, imageUrl: null }
    });

    if (badgeIds.length > 0) {
      await prisma.userBadge.createMany({
        data: badgeIds.map(bId => ({ userId: work.userId, badgeId: bId, assignedBy: admin.username })),
        skipDuplicates: true
      });
    }

    if (extraCp) {
      await prisma.user.update({ where: { id: work.userId }, data: { creatorPoints: { increment: extraCp } } });
    }

    res.json({ success: true, work: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi xử lý Work' });
  }
});

export default router;
