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
import {
  REVIEWER_SELECT,
  creatorWorkPairSet,
  reviewerNameFrom,
} from '@/lib/reviewerDisplay';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const status = parseQueueStatusParam(searchParams.get('status'));
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const pairSet = await creatorWorkPairSet();
    const [listed, tally] = await Promise.all([
      prisma.levelSubmission.findMany({
        where: status ? { status } : {},
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, gdUsername: true } },
          reviewer: { select: REVIEWER_SELECT },
        },
        orderBy: !status
          ? { submittedAt: 'desc' }
          : status === RecordStatus.PENDING
            ? { submittedAt: 'asc' }
            : { reviewedAt: 'desc' },
      }),
      prisma.levelSubmission.findMany({
        select: { userId: true, gdLevelId: true, status: true },
      }),
    ]);

    const unpaired = listed.filter((row) => !pairSet.has(`${row.userId}:${row.gdLevelId}`));
    const submissions = unpaired.slice(skip, skip + ADMIN_LIST_LIMIT).map((row) => ({
      ...row,
      reviewerName: reviewerNameFrom(row.reviewer),
    }));

    const unpairedTally = tally.filter((row) => !pairSet.has(`${row.userId}:${row.gdLevelId}`));
    const counts = {
      pending: unpairedTally.filter((row) => row.status === RecordStatus.PENDING).length,
      approved: unpairedTally.filter((row) => row.status === RecordStatus.APPROVED).length,
      rejected: unpairedTally.filter((row) => row.status === RecordStatus.REJECTED).length,
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
