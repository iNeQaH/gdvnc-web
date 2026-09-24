import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawList = (searchParams.get('list') || 'DEMON').toUpperCase();
    const list = rawList === 'PEMON' ? 'PEMON' : 'DEMON';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10) || 30));
    const offset = (page - 1) * limit;

    const [logs, totalCountResult] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT 
          "id", "list", "eventType", "gdLevelId", "levelName",
          "oldPlacement", "newPlacement", "aboveLevelName", "belowLevelName",
          "pushedOutLevelName", "causedByLevelName", "causedByPlacement",
          "oldRating", "newRating", "details", "createdAt"
        FROM "ListChangeLog"
        WHERE "list" = ${list}
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int as count
        FROM "ListChangeLog"
        WHERE "list" = ${list}
      `,
    ]);

    const total = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        success: true,
        list,
        logs: logs || [],
        total,
        page,
        limit,
        totalPages,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return publicApiError(error, 'Không thể tải nhật ký thay đổi.', 500);
  }
}
