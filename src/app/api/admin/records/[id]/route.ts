import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { consolidateBeforeApprove, recalculateUserPp } from '@/lib/recordUtils';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { action, rejectReason, reviewerId } = await req.json();

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

    if (action === 'APPROVE') {
      const consolidation = await consolidateBeforeApprove(id);
      if (!consolidation.ok) {
        return NextResponse.json({ error: consolidation.reason }, { status: 400 });
      }
    }

    const newStatus = action === 'APPROVE' ? RecordStatus.APPROVED : RecordStatus.REJECTED;

    const updatedRecord = await prisma.record.update({
      where: { id },
      data: {
        status: newStatus,
        rejectReason: action === 'REJECT' ? rejectReason || 'Không đạt quy chuẩn bằng chứng.' : null,
        reviewerId: reviewerId || null,
        reviewedAt: new Date(),
      },
    });

    if (action === 'APPROVE') {
      await recalculateUserPp(record.userId);

      await prisma.notification.create({
        data: {
          userId: record.userId,
          title: 'Kỷ Lục Được Phê Duyệt',
          message: `Kỷ lục hoàn thành màn chơi "${record.level.name}" của bạn đã được Admin phê duyệt và cập nhật điểm Points vào Bảng Xếp Hạng!`,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: record.userId,
          title: 'Kỷ Lục Bị Từ Chối',
          message: `Kỷ lục màn chơi "${record.level.name}" của bạn đã bị từ chối với lý do: "${rejectReason || 'Không đạt quy chuẩn bằng chứng hoặc thiếu thông tin.'}"`,
        },
      });
    }

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi kiểm duyệt kỷ lục.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const params = await context.params;
    const { id } = params;
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: 'Không tìm thấy kỷ lục.' }, { status: 404 });

    await prisma.record.delete({ where: { id } });
    await recalculateUserPp(record.userId);

    return NextResponse.json({ success: true, message: 'Đã xóa kỷ lục và cập nhật Points.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
