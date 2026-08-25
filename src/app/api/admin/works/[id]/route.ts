import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { recalculateCreatorPoints } from '@/lib/creatorPoints';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, rejectReason, badgeId, cpAwarded } = await req.json();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    }

    const work = await prisma.creatorWork.findUnique({
      where: { id },
      include: { user: true },
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
          rejectReason: rejectReason || 'Không đạt quy chuẩn Creator.',
          reviewedAt: new Date()
        }
      });
      
      // Notify
      await prisma.notification.create({
        data: {
          userId: work.userId,
          title: 'Tác Phẩm Bị Từ Chối',
          message: `Tác phẩm "${work.levelName}" của bạn đã bị từ chối. Lý do: ${rejectReason || 'Không xác định'}`
        }
      });
      
      return NextResponse.json({ success: true, work: updated });
    }

    // APPROVE — badgeId may be a comma-separated string (deco + layout)
    const badgeIds = typeof badgeId === 'string' ? badgeId.split(',').filter(Boolean) : [];
    const extraCp = Number.parseFloat(cpAwarded || '0') || 0;

    const updated = await prisma.creatorWork.update({
      where: { id },
      data: {
        status: RecordStatus.APPROVED,
        badgeGranted: badgeIds.join(','),
        cpGranted: extraCp,
        reviewedAt: new Date()
      }
    });

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

    const totalCp = await recalculateCreatorPoints(work.userId);

    const grantedBadges = badgeIds.length
      ? await prisma.badge.findMany({ where: { id: { in: badgeIds } } })
      : [];
    const badgeNames = grantedBadges.map((b) => b.name).join(', ') || 'Creator';

    await prisma.notification.create({
      data: {
        userId: work.userId,
        title: 'Tác Phẩm Được Phê Duyệt!',
        message: `Tác phẩm "${work.levelName}" của bạn đã được phê duyệt! Huy hiệu: ${badgeNames}. Tổng CP hiện tại: ${totalCp}.`
      }
    });

    return NextResponse.json({ success: true, work: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý Work' }, { status: 500 });
  }
}
