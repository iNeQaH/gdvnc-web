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
import { publicApiError } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = parseQueueStatusParam(searchParams.get('status'));
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const pairSet = await creatorWorkPairSet();
    const tally = await prisma.levelSubmission.findMany({
      select: { id: true, userId: true, gdLevelId: true, status: true, submittedAt: true, reviewedAt: true },
    });

    const unpairedAll = tally.filter((row) => !pairSet.has(`${row.userId}:${row.gdLevelId}`));
    const counts = {
      pending: unpairedAll.filter((row) => row.status === RecordStatus.PENDING).length,
      approved: unpairedAll.filter((row) => row.status === RecordStatus.APPROVED).length,
      rejected: unpairedAll.filter((row) => row.status === RecordStatus.REJECTED).length,
    };

    const unpaired = (status ? unpairedAll.filter((row) => row.status === status) : unpairedAll).slice().sort((a, b) => {
      if (!status) return b.submittedAt.getTime() - a.submittedAt.getTime();
      if (status === RecordStatus.PENDING) return a.submittedAt.getTime() - b.submittedAt.getTime();
      return (b.reviewedAt?.getTime() || 0) - (a.reviewedAt?.getTime() || 0);
    });
    const pageRows = unpaired.slice(skip, skip + ADMIN_LIST_LIMIT);
    const pageIds = pageRows.map((row) => row.id);

    const listed = pageIds.length
      ? await prisma.levelSubmission.findMany({
          where: { id: { in: pageIds } },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, gdUsername: true } },
            reviewer: { select: REVIEWER_SELECT },
          },
        })
      : [];
    const listedById = new Map(listed.map((row) => [row.id, row]));
    const submissions = pageIds
      .map((id) => listedById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        ...row,
        reviewerName: reviewerNameFrom(row.reviewer),
      }));

    return NextResponse.json({
      success: true,
      submissions,
      counts,
      page,
      limit: ADMIN_LIST_LIMIT,
      total: queueFilterTotal(counts, status),
    });
  } catch (error) {
    return publicApiError(error, 'Lỗi server');
  }
}
