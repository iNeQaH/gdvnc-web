import { Router } from 'express';
import { requireAdmin, requireFullAdmin } from '../../middleware/auth';
import prisma from '../../db';
import { Prisma, Role } from '@prisma/client';
import { claimLegacyRecords } from '../../services/claimLegacyRecords';

const SUPER_ADMIN = 'iNeQaH';
const router = Router();

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

router.get('/', requireAdmin, async (req, res) => {
  try {
    const query = (req.query.query as string || '').trim();
    const roleParam = (req.query.role as string || 'ALL').toUpperCase();
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
      return res.json({
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

    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tìm kiếm người dùng.' });
  }
});

router.delete('/', requireFullAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/:id/role', requireFullAdmin, async (req, res) => {
  try {
    const actorJwt = req.user!;
    const { id } = req.params;
    const { newRole, grantSupporterMonths } = req.body;

    if (!grantSupporterMonths && !['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({ error: 'Quyền (Role) không hợp lệ.' });
    }

    const actor = await prisma.user.findUnique({ where: { id: actorJwt.userId } });
    if (!actor || (actor.role !== Role.ADMIN && actor.username !== SUPER_ADMIN)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    if (target.username === SUPER_ADMIN) {
      return res.status(403).json({ error: 'Không thể thay đổi quyền của Super Admin (iNeQaH).' });
    }

    if (!grantSupporterMonths && target.role === Role.ADMIN && target.id !== actor.id) {
      if (actor.username !== SUPER_ADMIN) {
        return res.status(403).json({ error: 'Admin không thể gỡ quyền của một Admin khác. Chỉ Super Admin (iNeQaH) mới có quyền này.' });
      }
    }

    let updatedData: { role?: Role; supporterUntil?: Date | null } = {};
    if (grantSupporterMonths) {
      const months = parseInt(String(grantSupporterMonths), 10);
      if (!Number.isFinite(months) || months === 0) return res.status(400).json({ error: 'Số tháng Supporter không hợp lệ.' });
      if (months < 0) {
        updatedData.supporterUntil = null;
      } else {
        const now = new Date();
        const current = target.supporterUntil;
        const base = current && current > now ? current : now;
        const next = new Date(base.getTime());
        next.setMonth(next.getMonth() + months);
        updatedData.supporterUntil = next;
      }
    } else {
      updatedData.role = newRole as Role;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updatedData,
      select: { id: true, username: true, role: true, supporterUntil: true },
    });

    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi cập nhật quyền.' });
  }
});

router.post('/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const gdName = target.gdUsername?.trim();
    if (gdName) {
      const conflict = await prisma.user.findFirst({
        where: { id: { not: id }, gdVerified: true, gdUsername: { equals: gdName, mode: 'insensitive' } },
        select: { username: true },
      });
      if (conflict) {
        return res.status(409).json({ error: \Tên GD "\" đã được xác minh cho tài khoản \.\ });
      }
    }

    await prisma.user.update({ where: { id }, data: { gdVerified: true } });
    const { claimed } = await claimLegacyRecords(id, gdName || null);

    res.json({ success: true, gdVerified: true, gdUsername: target.gdUsername, claimed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi xác minh người dùng.' });
  }
});

export default router;
