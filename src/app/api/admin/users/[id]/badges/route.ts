import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { recalculateCreatorPoints } from '@/lib/recalculateCreatorPoints';

const SUPER_ADMIN = 'iNeQaH';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { id } = await params;
    const { badgeIds, currentAdminUsername } = await req.json();

    const actor = await prisma.user.findUnique({
      where: { username: currentAdminUsername },
    });
    if (!actor || (actor.role !== Role.ADMIN && actor.username !== SUPER_ADMIN)) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
    }

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

    const creatorPoints = await recalculateCreatorPoints(id);

    return NextResponse.json({ success: true, creatorPoints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật huy hiệu.' }, { status: 500 });
  }
}
