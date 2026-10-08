import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publicApiError } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const take = parseInt(searchParams.get('take') || '100', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count({ where })
    ]);

    return NextResponse.json({ success: true, logs, total });
  } catch (error: any) {
    return publicApiError(error, 'Failed to fetch audit logs.', 500);
  }
}
