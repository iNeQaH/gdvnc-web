import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_LIST_LIMIT, parsePageParam } from '@/lib/adminQueue';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const page = parsePageParam(searchParams.get('page'));
    const skip = (page - 1) * ADMIN_LIST_LIMIT;

    const [helps, total] = await Promise.all([
      prisma.helpRequest.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: ADMIN_LIST_LIMIT,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, gdUsername: true } },
        },
      }),
      prisma.helpRequest.count(),
    ]);

    return NextResponse.json({ success: true, helps, page, limit: ADMIN_LIST_LIMIT, total });
  } catch (error: any) {
    console.error('Admin helps GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.helpRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
