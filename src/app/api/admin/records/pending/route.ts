import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { parseQueueStatusParam, sortModerationQueue } from '@/lib/adminQueue';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const status = parseQueueStatusParam(searchParams.get('status'));

    const [records, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.record.findMany({
        where: status ? { status } : {},
        include: {
          user: true,
          level: true,
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
      }),
      prisma.record.count({ where: { status: RecordStatus.PENDING } }),
      prisma.record.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.record.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    return NextResponse.json({
      success: true,
      records: status ? records : sortModerationQueue(records),
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách kỷ lục.' }, { status: 500 });
  }
}
