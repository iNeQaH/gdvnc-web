import { publicApiError } from '@/lib/apiError';
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
    const q = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'newest';
    const role = searchParams.get('role') || 'ALL';
    const source = searchParams.get('source') || 'ALL';
    const tag = searchParams.get('tag') || 'ALL';

    const whereClause: any = status ? { status } : {};
    
    if (q) {
      const trimmedQ = q.trim();
      const orConditions: any[] = [
        { level: { name: { contains: trimmedQ, mode: 'insensitive' } } },
        { user: { username: { contains: trimmedQ, mode: 'insensitive' } } },
        { user: { gdUsername: { contains: trimmedQ, mode: 'insensitive' } } },
      ];
      if (/^(vn|vietnam|việt nam)$/i.test(trimmedQ)) {
        orConditions.push({ level: { isVN: true } });
      }
      const numQ = parseInt(trimmedQ, 10);
      if (Number.isFinite(numQ) && numQ > 0) {
        orConditions.push({ level: { gdLevelId: numQ } });
      }
      whereClause.OR = orConditions;
    }
    
    if (role === 'ADMIN' || role === 'MODERATOR' || role === 'USER') {
      whereClause.user = { ...whereClause.user, role };
    } else if (role === 'SUPPORTER') {
      whereClause.user = { ...whereClause.user, supporterUntil: { gt: new Date() } };
    }

    if (source === 'REVIEWED') {
      // Chỉ lấy record đã có người duyệt thực tế
      whereClause.reviewedAt = { not: null };
    } else if (source === 'IMPORTED') {
      // Lấy record import / chưa có người duyệt
      whereClause.reviewedAt = null;
    }

    if (tag === 'VN') {
      whereClause.level = { ...whereClause.level, isVN: true };
    } else if (tag === 'NON_VN') {
      whereClause.level = { ...whereClause.level, isVN: false };
    }

    const [records, grouped] = await Promise.all([
      prisma.record.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, username: true, gdUsername: true, avatarUrl: true, role: true, supporterUntil: true } },
          level: { include: { _count: { select: { records: { where: { status: 'APPROVED' } } } } } },
          reviewer: { select: REVIEWER_SELECT },
        },
        orderBy: sort === 'oldest'
          ? (status === RecordStatus.PENDING
              ? [{ submittedAt: 'asc' }]
              : [{ reviewedAt: { sort: 'asc', nulls: 'first' } }, { submittedAt: 'asc' }])
          : (status === RecordStatus.PENDING
              ? [{ submittedAt: 'desc' }]
              : [{ reviewedAt: { sort: 'desc', nulls: 'last' } }, { submittedAt: 'desc' }]),
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
    return publicApiError(error, 'Lỗi tải danh sách kỷ lục.', 500);
  }
}
