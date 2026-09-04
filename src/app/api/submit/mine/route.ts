import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') || 'PLAYER').toUpperCase();

  try {
    if (type === 'CREATOR') {
      const works = await prisma.creatorWork.findMany({
        where: { userId: user.userId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          levelName: true,
          gdLevelId: true,
          rejectReason: true,
        },
      });
      return NextResponse.json({
        success: true,
        items: works.map((w) => ({ ...w, kind: 'work' as const })),
      });
    }

    if (type === 'LEVEL') {
      const items = await prisma.levelSubmission.findMany({
        where: { userId: user.userId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          gdLevelId: true,
          rejectReason: true,
        },
      });
      return NextResponse.json({ success: true, items });
    }

    const items = await prisma.record.findMany({
      where: { userId: user.userId },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        level: { select: { name: true, gdLevelId: true } },
      },
    });
    return NextResponse.json({
      success: true,
      items: items.map((r) => ({
        id: r.id,
        status: r.status,
        submittedAt: r.submittedAt,
        levelName: r.level.name,
        gdLevelId: r.level.gdLevelId,
        rejectReason: r.rejectReason,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách.' }, { status: 500 });
  }
}
