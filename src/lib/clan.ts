import prisma from '@/lib/prisma';
import { CLAN_TIER_CONFIG, calculateUserSp, getClanTier } from '@/lib/clanTypes';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';
export { CLAN_TIER_CONFIG, calculateUserSp, getClanTier };

/**
 * Trả về cấp bậc Tier (0, 1, 2, 3) từ dữ liệu Clan có contributions và members.
 */
export function getClanTierFromClan(clan: any): number {
  if (!clan) return 0;
  if (typeof clan.tier === 'number') return clan.tier;
  if (!clan.contributions || !clan.members) {
    return clan.colorGradient ? 2 : 1;
  }
  const memberIds = new Set((clan.members || []).map((m: any) => m.userId));
  let totalSp = 0;
  for (const contrib of clan.contributions || []) {
    if (!memberIds.has(contrib.userId)) continue;
    const userMax = calculateUserSp(contrib.user);
    totalSp += Math.min(contrib.spPledged, userMax);
  }
  return getClanTier(totalSp).tier;
}

/**
 * Định dạng và làm sạch dữ liệu clan cho user: nếu clan rơi xuống Tier < 2,
 * tự động loại bỏ colorGradient để tag trở về màu đơn sắc (solid color).
 */
export function sanitizeUserClan(clan: any) {
  if (!clan) return null;
  const tier = getClanTierFromClan(clan);
  const { contributions: _c, members: _m, ...rest } = clan;
  return {
    ...rest,
    tier,
    colorGradient: tier >= 2 ? (clan.colorGradient ?? null) : null,
  };
}

/**
 * Đồng bộ và tính toán tổng số SP Coin thực tế của Clan.
 * Tự động cập nhật thời gian ân hạn 7 ngày và trạng thái tạm ngưng (suspended).
 * Khi clan bị hạ từ Tier 2 xuống Tier 1 hoặc thấp hơn, tự động xóa colorGradient và themeGradient trong DB.
 */
/**
 * Tự động loại bỏ các thành viên vượt quá giới hạn sức chứa của Tier hiện tại sau khi hết 7 ngày ân hạn.
 * Thứ tự ưu tiên lọc:
 * 1. Thành viên không có chức vụ (MEMBER trước MODERATOR). Trưởng Clan (LEADER) không bao giờ bị đá.
 * 2. Thành viên đóng góp SP Coin ít hơn (0 SP bị đá trước 1 SP, 2 SP...).
 * 3. Thành viên ít hoạt động / lần đăng nhập hoặc cập nhật cũ nhất.
 */
export async function pruneExcessClanMembers(clan: any, maxAllowed: number, tierName: string) {
  const allMembers = await prisma.clanMember.findMany({
    where: { clanId: clan.id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          lastLoginAt: true,
          updatedAt: true,
          createdAt: true,
        },
      },
    },
  });

  const candidateMembers = allMembers.filter((m) => m.role !== 'LEADER');
  const excessCount = allMembers.length - maxAllowed;
  if (excessCount <= 0 || candidateMembers.length === 0) return;

  const contribs = await prisma.clanSpContribution.findMany({
    where: { clanId: clan.id },
    select: { userId: true, spPledged: true },
  });
  const spMap = new Map<string, number>();
  for (const c of contribs) {
    spMap.set(c.userId, c.spPledged);
  }

  candidateMembers.sort((a, b) => {
    // 1. Ưu tiên không có role (MEMBER = 0 bị đá trước MODERATOR = 1)
    const roleRankA = a.role === 'MEMBER' ? 0 : 1;
    const roleRankB = b.role === 'MEMBER' ? 0 : 1;
    if (roleRankA !== roleRankB) return roleRankA - roleRankB;

    // 2. Sau đó là người đóng góp SP ít hơn (0 SP trước, rồi 1 SP, 2 SP...)
    const spA = spMap.get(a.userId) || 0;
    const spB = spMap.get(b.userId) || 0;
    if (spA !== spB) return spA - spB;

    // 3. Ít hoạt động: thời gian login / hoạt động cũ nhất bị đá trước
    const timeA = a.user.lastLoginAt
      ? new Date(a.user.lastLoginAt).getTime()
      : (a.user.updatedAt ? new Date(a.user.updatedAt).getTime() : new Date(a.joinedAt).getTime());
    const timeB = b.user.lastLoginAt
      ? new Date(b.user.lastLoginAt).getTime()
      : (b.user.updatedAt ? new Date(b.user.updatedAt).getTime() : new Date(b.joinedAt).getTime());
    return timeA - timeB;
  });

  const toEvict = candidateMembers.slice(0, excessCount);
  const toEvictIds = toEvict.map((m) => m.id);
  const toEvictUserIds = toEvict.map((m) => m.userId);

  // Xóa khỏi bảng ClanMember
  await prisma.clanMember.deleteMany({
    where: { id: { in: toEvictIds } },
  });

  // Dọn dẹp đóng góp SP nếu có
  await prisma.clanSpContribution.deleteMany({
    where: { clanId: clan.id, userId: { in: toEvictUserIds } },
  });

  // Gửi thông báo đến từng thành viên bị mời ra khỏi Clan
  try {
    await prisma.notification.createMany({
      data: toEvict.map((m) => ({
        userId: m.userId,
        title: 'Mời ra khỏi Clan do tụt Tier',
        message: `Clan "${clan.name}" bị hạ cấp xuống ${tierName} (sức chứa tối đa ${maxAllowed} thành viên). Do hết thời hạn 7 ngày ân hạn mà chưa bù đủ SP, hệ thống đã tự động mời bạn ra khỏi Clan theo quy định ưu tiên lọc thành viên.`,
      })),
    });
  } catch (err) {
    console.error('Failed to notify evicted clan members:', err);
  }
}

/**
 * Đồng bộ và tính toán tổng số SP Coin thực tế của Clan.
 * Tự động cập nhật thời gian ân hạn 7 ngày và trạng thái tạm ngưng (suspended).
 * Khi clan bị hạ từ Tier 2 xuống Tier 1 hoặc thấp hơn, tự động xóa colorGradient và themeGradient trong DB.
 * Khi supporter của user giảm/hết hạn, tự động giảm/xóa spPledged trong DB ngay lập tức.
 * Khi clan tụt tier và vượt giới hạn thành viên, hết 7 ngày sẽ tự động đá các member vượt giới hạn.
 */
export async function syncAndGetClanSp(clanId: string) {
  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    include: {
      contributions: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              supporterUntil: true,
              spGrants: { select: { id: true, amount: true, expiresAt: true } },
            },
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

  // 1. Đồng bộ và làm sạch SP Coin đóng góp trong Database
  // Nếu supporter hết hạn -> lập tức trừ về 0 (xóa/set 0 trong DB)
  // Nếu supporter giảm tháng -> trừ SP đóng góp xuống mức tối đa hiện có
  let totalSp = 0;
  for (const contrib of clan.contributions) {
    if (!memberUserIds.has(contrib.userId)) {
      await prisma.clanSpContribution.deleteMany({
        where: { clanId: clan.id, userId: contrib.userId },
      });
      continue;
    }

    const userMaxSp = calculateUserSp(contrib.user);
    const validPledge = Math.min(contrib.spPledged, userMaxSp);

    if (contrib.spPledged !== validPledge) {
      if (validPledge <= 0) {
        await prisma.clanSpContribution.deleteMany({
          where: { clanId: clan.id, userId: contrib.userId },
        });
      } else {
        await prisma.clanSpContribution.update({
          where: { userId: contrib.userId },
          data: { spPledged: validPledge },
        });
      }
      contrib.spPledged = validPledge;
    }

    totalSp += validPledge;
  }

  const tierInfo = getClanTier(totalSp);
  const now = new Date();
  let isSuspended = clan.isSuspended;
  let gracePeriodUntil = clan.gracePeriodUntil;

  // Điều kiện cần ân hạn 7 ngày:
  // 1. Thiếu điểm SP tối thiểu (totalSp < 3)
  // 2. Clan tụt tier khiến số lượng thành viên vượt quá sức chứa tối đa của Tier hiện tại (members.length > tierInfo.maxMembers)
  const isBelowMinSp = totalSp < 3;
  const isOverMemberLimit = clan.members.length > tierInfo.maxMembers;

  if (isBelowMinSp || isOverMemberLimit) {
    if (!gracePeriodUntil) {
      // Bắt đầu ân hạn 7 ngày
      gracePeriodUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (new Date(gracePeriodUntil) < now) {
      // ĐÃ HẾT 7 NGÀY ÂN HẠN:
      // A. Nếu totalSp < 3: chuyển sang tạm ngưng
      if (isBelowMinSp) {
        isSuspended = true;
      }

      // B. Nếu số thành viên vượt quá giới hạn Tier hiện tại: tự động đá member vượt giới hạn!
      if (isOverMemberLimit) {
        await pruneExcessClanMembers(clan, tierInfo.maxMembers, tierInfo.name);
        const remainingCount = await prisma.clanMember.count({ where: { clanId: clan.id } });
        if (remainingCount <= tierInfo.maxMembers && !isBelowMinSp) {
          gracePeriodUntil = null;
        }
      }
    }
  } else {
    // Đã đủ điểm SP và số thành viên trong ngưỡng cho phép
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

  // Khi clan bị hạ xuống dưới Tier 2 (totalSp < 10):
  // Xóa sạch colorGradient và themeGradient trong DB và in-memory để tag và theme trở về solid color
  if (tierInfo.tier < 2 && (clan.colorGradient || clan.themeGradient)) {
    await prisma.clan.update({
      where: { id: clanId },
      data: {
        colorGradient: null,
        themeGradient: null,
      },
    });
    clan.colorGradient = null;
    clan.themeGradient = null;
    bustPublicCache(CACHE_TAGS.leaderboard, CACHE_TAGS.highlights);
  }

  // Khi clan bị hạ xuống dưới Tier 3 (totalSp < 20):
  // Tắt hiệu ứng hào quang Glow nếu có cài đặt trong themeColor hoặc themeGradient
  if (tierInfo.tier < 3) {
    let needsGlowUpdate = false;
    let nextThemeColor = clan.themeColor;
    let nextThemeGradient = clan.themeGradient;
    if (nextThemeColor && nextThemeColor.includes('/*glow:1')) {
      nextThemeColor = nextThemeColor.replace(/\/\*glow:1/g, '/*glow:0');
      needsGlowUpdate = true;
    }
    if (nextThemeGradient && nextThemeGradient.includes('/*glow:1')) {
      nextThemeGradient = nextThemeGradient.replace(/\/\*glow:1/g, '/*glow:0');
      needsGlowUpdate = true;
    }
    if (needsGlowUpdate) {
      await prisma.clan.update({
        where: { id: clanId },
        data: {
          themeColor: nextThemeColor,
          themeGradient: nextThemeGradient,
        },
      });
      clan.themeColor = nextThemeColor;
      clan.themeGradient = nextThemeGradient;
    }
  }

  const currentMemberCount = await prisma.clanMember.count({ where: { clanId: clan.id } });

  return {
    ...clan,
    colorGradient: tierInfo.tier >= 2 ? clan.colorGradient : null,
    themeGradient: tierInfo.tier >= 2 ? clan.themeGradient : null,
    totalSp,
    tier: tierInfo.tier,
    tierName: tierInfo.name,
    maxMembers: tierInfo.maxMembers,
    hasGradient: tierInfo.hasGradient,
    isSufficient: tierInfo.isSufficient,
    isSuspended,
    gracePeriodUntil,
    memberCount: currentMemberCount,
  };
}

export async function syncAllClans() {
  const clans = await prisma.clan.findMany({ select: { id: true } });
  for (const c of clans) {
    await syncAndGetClanSp(c.id);
  }
}


