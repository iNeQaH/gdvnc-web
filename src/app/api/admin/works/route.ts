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

    const [works, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.creatorWork.findMany({
        where: status ? { status } : {},
        include: {
          user: {
            select: { username: true, id: true, avatarUrl: true },
          },
          reviewer: { select: { id: true, username: true } },
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
      }),
      prisma.creatorWork.count({ where: { status: RecordStatus.PENDING } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    return NextResponse.json({
      success: true,
      works: status ? works : sortModerationQueue(works),
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
