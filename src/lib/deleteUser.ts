import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { clipText } from '@/lib/validate';

export async function deleteUserAccount(actorId: string, targetId: string, reason: string) {
  const trimmedReason = clipText(reason, 500);
  if (!trimmedReason || trimmedReason.length < 3) {
    return { error: 'Vui lòng nhập lý do xoá tài khoản (tối thiểu 3 ký tự).', status: 400 as const };
  }

  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId } }),
    prisma.user.findUnique({ where: { id: targetId } }),
  ]);

  if (!actor) {
    return { error: 'Tài khoản không hợp lệ.', status: 401 as const };
  }

  const isSelf = actor.id === targetId;
  const isAdminActor = actor.role === Role.ADMIN || isSuperAdminUser(actor);

  if (!isSelf && !isAdminActor) {
    return { error: 'Bạn không có quyền thực hiện thao tác này.', status: 403 as const };
  }
  if (!target) {
    return { error: 'Tài khoản không tồn tại.', status: 404 as const };
  }
  if (isSuperAdminUser(target)) {
    return { error: 'Không thể xoá Super Admin.', status: 403 as const };
  }
  if (target.role === Role.ADMIN && !isSuperAdminUser(actor) && !isSelf) {
    return { error: 'Chỉ Super Admin mới có thể xoá tài khoản Admin khác.', status: 403 as const };
  }

  const actorName = actor.username;
  const targetName = target.username;

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
    prisma.helpRequest.create({
      data: {
        userId: null,
        title: `Tài khoản đã xoá: ${targetName}`,
        content: `Người thực hiện xoá: ${actorName} (${isSelf ? 'Tự xoá tài khoản' : 'BQT xoá'})\nTài khoản bị xoá: ${targetName} (ID: ${targetId})\nLý do xoá: ${trimmedReason}`,
        status: 'RESOLVED',
      },
    }),
    prisma.user.delete({ where: { id: targetId } }),
  ]);

  return { success: true as const };
}
