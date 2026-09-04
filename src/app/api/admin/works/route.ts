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

    const [works, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.creatorWork.findMany({
        where: status ? { status } : {},
        include: {
          user: {
            select: { username: true, id: true, avatarUrl: true, gdUsername: true },
          },
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
      prisma.creatorWork.count({ where: { status: RecordStatus.PENDING } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.APPROVED } }),
      prisma.creatorWork.count({ where: { status: RecordStatus.REJECTED } }),
    ]);

    const gdIds = [...new Set(works.map((w) => w.gdLevelId).filter((id): id is number => typeof id === 'number' && id > 0))];
    const linkedLevels = gdIds.length
      ? await prisma.level.findMany({
          where: { gdLevelId: { in: gdIds } },
          select: {
            gdLevelId: true,
            name: true,
            creatorName: true,
            difficulty: true,
            difficultyFace: true,
            ratingType: true,
            mode: true,
            isVN: true,
            isChallenge: true,
            placement: true,
            vnPlacement: true,
          },
        })
      : [];
    const linkedByGd = new Map(linkedLevels.map((lvl) => [lvl.gdLevelId, lvl]));

    const counts = {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };

    return NextResponse.json({
      success: true,
      works: works.map((work) => {
        const linkedLevel = work.gdLevelId ? linkedByGd.get(work.gdLevelId) || null : null;
        const base = work.status === RecordStatus.PENDING ? work : { ...work, imageUrl: null };
        return { ...base, linkedLevel, reviewerName: reviewerNameFrom(work.reviewer) };
      }),
      counts,
      page,
      limit: ADMIN_LIST_LIMIT,
      total: queueFilterTotal(counts, status),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
