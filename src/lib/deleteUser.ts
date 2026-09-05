import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';

export async function deleteUserAccount(actorId: string, targetId: string) {
  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId } }),
    prisma.user.findUnique({ where: { id: targetId } }),
  ]);

  if (!actor || (actor.role !== Role.ADMIN && !isSuperAdminUser(actor))) {
    return { error: 'Bạn không có quyền thực hiện thao tác này.', status: 403 as const };
  }
  if (!target) {
    return { error: 'User không tồn tại', status: 404 as const };
  }
  if (isSuperAdminUser(target)) {
    return { error: 'Không thể xoá Super Admin.', status: 403 as const };
  }
  if (target.role === Role.ADMIN && !isSuperAdminUser(actor) && actor.id !== target.id) {
    return { error: 'Chỉ Super Admin mới có thể xoá tài khoản Admin khác.', status: 403 as const };
  }

  await prisma.$transaction([
    prisma.record.updateMany({
      where: { userId: targetId },
      data: {
        userId: null,
        legacyPlayerName: target.gdUsername || target.username,
      },
    }),
    prisma.record.updateMany({ where: { reviewerId: targetId }, data: { reviewerId: null } }),
    prisma.creatorWork.updateMany({ where: { reviewerId: targetId }, data: { reviewerId: null } }),
    prisma.levelSubmission.updateMany({ where: { reviewerId: targetId }, data: { reviewerId: null } }),
    prisma.level.updateMany({ where: { creatorId: targetId }, data: { creatorId: null } }),
    prisma.user.delete({ where: { id: targetId } }),
  ]);

  return { success: true as const };
}
