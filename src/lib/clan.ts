import prisma from '@/lib/prisma';
import { CLAN_TIER_CONFIG, calculateUserSp, getClanTier } from '@/lib/clanTypes';
export { CLAN_TIER_CONFIG, calculateUserSp, getClanTier };

/**
 * Đồng bộ và tính toán tổng số SP Coin thực tế của Clan.
 * Tự động cập nhật thời gian ân hạn 7 ngày và trạng thái tạm ngưng (suspended).
 */
export async function syncAndGetClanSp(clanId: string) {
  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    include: {
      contributions: {
        include: {
          user: {
            select: { id: true, username: true, supporterUntil: true },
          },
        },
      },
      members: {
        select: { userId: true },
      },
    },
  });

  if (!clan) return null;

  const memberUserIds = new Set(clan.members.map((m) => m.userId));

  // Tính tổng SP hợp lệ (chỉ tính thành viên còn trong clan và còn hạn supporter)
  let totalSp = 0;
  for (const contrib of clan.contributions) {
    if (!memberUserIds.has(contrib.userId)) continue;
    const userMaxSp = calculateUserSp(contrib.user);
    const validPledge = Math.min(contrib.spPledged, userMaxSp);
    totalSp += validPledge;
  }

  const now = new Date();
  let isSuspended = clan.isSuspended;
  let gracePeriodUntil = clan.gracePeriodUntil;

  if (totalSp < 3) {
    if (!gracePeriodUntil) {
      // Bắt đầu ân hạn 7 ngày
      gracePeriodUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (new Date(gracePeriodUntil) < now) {
      // Hết hạn ân hạn 7 ngày -> chuyển sang tạm ngưng
      isSuspended = true;
    }
  } else {
    // Đã đủ điểm SP -> kích hoạt lại
    isSuspended = false;
    gracePeriodUntil = null;
  }

  // Cập nhật trạng thái nếu có thay đổi
  if (isSuspended !== clan.isSuspended || gracePeriodUntil !== clan.gracePeriodUntil) {
    await prisma.clan.update({
      where: { id: clanId },
      data: {
        isSuspended,
        gracePeriodUntil,
      },
    });
  }

  const tierInfo = getClanTier(totalSp);

  return {
    ...clan,
    totalSp,
    tier: tierInfo.tier,
    tierName: tierInfo.name,
    maxMembers: tierInfo.maxMembers,
    hasGradient: tierInfo.hasGradient,
    isSufficient: tierInfo.isSufficient,
    isSuspended,
    gracePeriodUntil,
    memberCount: clan.members.length,
  };
}
