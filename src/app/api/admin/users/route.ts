import { requireAdmin, requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { deleteUserAccount } from '@/lib/deleteUser';
import { publicApiError } from '@/lib/apiError';
import { isSuperAdminUser } from '@/lib/roles';

const userSelect = {
  id: true,
  username: true,
  role: true,
  avatarUrl: true,
  supporterUntil: true,
  classicPp: true,
  platformerPp: true,
  creatorPoints: true,
  createdAt: true,
  updatedAt: true,
  gdUsername: true,
  gdVerified: true,
  isBanned: true,
} satisfies Prisma.UserSelect;

function searchClause(query: string): Prisma.UserWhereInput | undefined {
  if (!query) return undefined;
  return {
    OR: [
      { username: { contains: query, mode: 'insensitive' } },
      { gdUsername: { contains: query, mode: 'insensitive' } },
    ],
  };
}

export async function GET(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('query') || '').trim();
    const roleParam = (searchParams.get('role') || 'ALL').toUpperCase();
    const search = searchClause(query);

    const and: Prisma.UserWhereInput[] = [];
    if (search) and.push(search);

    if (roleParam === 'ADMIN' || roleParam === 'MODERATOR' || roleParam === 'USER') {
      and.push({ role: roleParam as Role });
    } else if (roleParam === 'SUPPORTER') {
      and.push({ supporterUntil: { gt: new Date() } });
    }

    const where: Prisma.UserWhereInput | undefined = and.length ? { AND: and } : undefined;
    const staffTake = roleParam === 'ADMIN' || roleParam === 'MODERATOR' || roleParam === 'SUPPORTER' ? 200 : 50;

    let users: any[] = [];

    if (roleParam === 'ALL' && !query) {
      const [staff, recent] = await Promise.all([
        prisma.user.findMany({
          where: { role: { in: [Role.ADMIN, Role.MODERATOR] } },
          select: userSelect,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findMany({
          where: { role: Role.USER },
          select: userSelect,
          orderBy: { createdAt: 'desc' },
          take: 60,
        }),
      ]);
      const staffIds = new Set(staff.map((u) => u.id));
      users = [...staff, ...recent.filter((u) => !staffIds.has(u.id))];
    } else {
      users = await prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        take: staffTake,
      });
    }

    // Attach latest activity from PageVisit
    const userIds = users.map((u) => u.id);
    let visitMap = new Map<string, Date>();
    if (userIds.length > 0) {
      try {
        const visits = await prisma.pageVisit.groupBy({
          by: ['ipHash'],
          _max: { createdAt: true },
          where: { ipHash: { in: userIds.map((id) => `usr_${id}`) } },
        });
        visitMap = new Map(visits.map((v) => [v.ipHash.replace('usr_', ''), v._max.createdAt!]));
      } catch {}
    }

    const enrichedUsers = users.map((u) => ({
      ...u,
      isSuperAdmin: isSuperAdminUser(u),
      lastActiveAt: visitMap.get(u.id) || u.updatedAt || u.createdAt,
    }));

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi tìm kiếm người dùng.', 500);
  }
}

export async function DELETE(req: Request) {
  let actor;
  try {
    actor = await requireFullAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const reason = searchParams.get('reason') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId cần xóa.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Người dùng không tồn tại.' }, { status: 404 });
    }

    if (isSuperAdminUser(targetUser)) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản Super Admin.' }, { status: 403 });
    }

    const delResult = await deleteUserAccount(actor.userId, targetUser.id, reason);
    if ('error' in delResult && delResult.error) {
      return NextResponse.json({ error: delResult.error }, { status: delResult.status || 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa vĩnh viễn tài khoản ${targetUser.username}.`,
    });
  } catch (error: any) {
    return publicApiError(error, 'Lỗi khi xóa tài khoản.', 500);
  }
}
