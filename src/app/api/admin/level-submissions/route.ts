import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import {
  ADMIN_LIST_LIMIT,
  parsePageParam,
  parseQueueStatusParam,
  queueFilterTotal,
} from '@/lib/adminQueue';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const status = parseQueueStatusParam(searchParams.get('status'));
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [submissions, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.levelSubmission.findMany({
        where: status ? { status } : {},
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, gdUsername: true } },
          reviewer: { select: { id: true, username: true } },
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
        skip,
        take: ADMIN_LIST_LIMIT,
      }),
      prisma.levelSubmission.count({ where: { status: RecordStatus.PENDING } }),
      prisma.levelSubmission.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.levelSubmission.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    const counts = {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };

    return NextResponse.json({
      success: true,
      submissions,
      counts,
      page,
      limit: ADMIN_LIST_LIMIT,
      total: queueFilterTotal(counts, status),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
