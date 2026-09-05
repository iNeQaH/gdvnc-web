import { requireAdmin, requireFullAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { deleteUserAccount } from '@/lib/deleteUser';
import { publicApiError } from '@/lib/apiError';

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
  gdUsername: true,
  gdVerified: true,
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
          take: 50,
        }),
      ]);
      const staffIds = new Set(staff.map((u) => u.id));
      return NextResponse.json({
        success: true,
        users: [...staff, ...recent.filter((u) => !staffIds.has(u.id))],
      });
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
      take: staffTake,
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tìm kiếm người dùng.' }, { status: 500 });
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
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const result = await deleteUserAccount(actor.userId, id);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return publicApiError(error);
  }
}
