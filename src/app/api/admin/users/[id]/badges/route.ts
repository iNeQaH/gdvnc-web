import { requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireFullAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { badgeIds } = await req.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    const nextIds: string[] = Array.isArray(badgeIds)
      ? badgeIds.filter((x: unknown) => typeof x === 'string' && x)
      : [];

    const existing = await prisma.userBadge.findMany({
      where: { userId: id },
      select: { badgeId: true },
    });
    const existingIds = existing.map((ub) => ub.badgeId);

    const toAdd = nextIds.filter((badgeId) => !existingIds.includes(badgeId));
    const toRemove = existingIds.filter((badgeId) => !nextIds.includes(badgeId));

    await prisma.$transaction([
      ...toAdd.map((badgeId) =>
        prisma.userBadge.create({
          data: { userId: id, badgeId, assignedBy: actor.username },
        })
      ),
      ...toRemove.map((badgeId) =>
        prisma.userBadge.delete({
          where: { userId_badgeId: { userId: id, badgeId } },
        })
      ),
    ]);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { creatorPoints: true },
    });

    return NextResponse.json({ success: true, creatorPoints: user?.creatorPoints ?? 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật huy hiệu.' }, { status: 500 });
  }
}
