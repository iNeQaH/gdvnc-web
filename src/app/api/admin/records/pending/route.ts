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
import { REVIEWER_SELECT, reviewerNameFrom } from '@/lib/reviewerDisplay';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const status = parseQueueStatusParam(searchParams.get('status'));
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [records, grouped] = await Promise.all([
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
      prisma.record.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const countMap = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
    const counts = {
      pending: countMap[RecordStatus.PENDING] || 0,
      approved: countMap[RecordStatus.APPROVED] || 0,
      rejected: countMap[RecordStatus.REJECTED] || 0,
    };

    return NextResponse.json({
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
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách kỷ lục.' }, { status: 500 });
  }
}
