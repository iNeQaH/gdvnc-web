import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { isSuperAdminUser } from '@/lib/roles';
import { clipText } from '@/lib/validate';
import { syncAndGetClanSp } from '@/lib/clan';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { logAudit } from '@/lib/audit';

export async function deleteUserAccount(
  actorId: string,
  targetId: string,
  reason: string,
  options?: { password?: string; ipAddress?: string }
) {
  const trimmedReason = clipText(reason, 500);
  if (!trimmedReason || trimmedReason.length < 3) {
    return { error: 'Vui lòng nhập lý do xoá tài khoản (tối thiểu 3 ký tự).', status: 400 as const };
  }

  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId } }),
    prisma.user.findUnique({
      where: { id: targetId },
      include: {
        clanMember: {
          include: {
            clan: {
              include: {
                members: {
                  where: { userId: { not: targetId } },
                  orderBy: [
                    { role: 'asc' }, // LEADER, MODERATOR, MEMBER (alphabetical: LEADER, MEMBER, MODERATOR - we sort manually below)
                    { joinedAt: 'asc' },
                  ],
                },
              },
            },
          },
        },
      },
    }),
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

  if (isSelf) {
    const password = typeof options?.password === 'string' ? options.password : '';
    if (!password || password.length > 128) {
      return { error: 'Vui lòng nhập mật khẩu để xác nhận xoá tài khoản.', status: 400 as const };
    }
    if (!target.passwordHash) {
      return { error: 'Tài khoản không có mật khẩu.', status: 400 as const };
    }
    const ok = await bcrypt.compare(password, target.passwordHash);
    if (!ok) {
      return { error: 'Mật khẩu xác nhận không đúng.', status: 403 as const };
    }
  }

  const actorName = actor.username;
  const targetName = target.username;
  const userClan = target.clanMember?.clan;
  const clanIdToSync = userClan?.id;

  // Xử lý chuyển quyền Leader Clan nếu target là Leader và Clan còn thành viên khác
  if (userClan && userClan.leaderId === targetId) {
    const otherMembers = userClan.members;
    if (otherMembers.length > 0) {
      // Ưu tiên MODERATOR trước, rồi đến MEMBER theo thời gian tham gia sớm nhất
      const nextLeader = [...otherMembers].sort((a, b) => {
        if (a.role === 'MODERATOR' && b.role !== 'MODERATOR') return -1;
        if (b.role === 'MODERATOR' && a.role !== 'MODERATOR') return 1;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      })[0];

      await prisma.$transaction([
        prisma.clanMember.update({
          where: { id: nextLeader.id },
          data: { role: 'LEADER' },
        }),
        prisma.clan.update({
          where: { id: userClan.id },
          data: { leaderId: nextLeader.userId },
        }),
      ]);
    }
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
    prisma.clanSpContribution.deleteMany({ where: { userId: targetId } }),
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

  if (clanIdToSync) {
    try {
      await syncAndGetClanSp(clanIdToSync);
    } catch {}
  }

  clearLeaderboardCache();

  void logAudit(actor.id, 'DELETE_USER', {
    targetId,
    targetUsername: targetName,
    reason: trimmedReason,
    isSelf,
  }, options?.ipAddress);

  return { success: true as const };
}
