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

  // Tính tổng SP thực tế từ đóng góp của các thành viên hiện tại trong Clan
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
    memberCount: clan.members.length,
  };
}

/**
 * Đồng bộ toàn bộ các Clan hiện có trong cơ sở dữ liệu.
 */
export async function syncAllClans() {
  const clans = await prisma.clan.findMany({ select: { id: true } });
  for (const c of clans) {
    await syncAndGetClanSp(c.id);
  }
}

/**
 * Tính toán độ phủ tiến độ (0-100%) của một ClanLevel từ các đoạn chạy (runs) đã được duyệt (APPROVED).
 * Ghép các đoạn giao nhau hoặc nối tiếp nhau (ví dụ: 0-35%, 35-70%, 70-100% -> 0-100% = 100%).
 */
export function computeClanLevelProgress(
  approvedRuns: Array<{ startPercent: number; endPercent: number }>
): {
  mergedIntervals: Array<{ start: number; end: number }>;
  coveragePercent: number;
  isFull100: boolean;
} {
  const valid = approvedRuns
    .map((r) => ({
      start: Math.max(0, Math.min(100, Math.round(Number(r.startPercent) || 0))),
      end: Math.max(0, Math.min(100, Math.round(Number(r.endPercent) || 0))),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  if (valid.length === 0) {
    return { mergedIntervals: [], coveragePercent: 0, isFull100: false };
  }

  const merged: Array<{ start: number; end: number }> = [{ ...valid[0] }];
  for (let i = 1; i < valid.length; i++) {
    const cur = valid[i];
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }

  const total = merged.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const coveragePercent = Math.max(0, Math.min(100, total));
  const isFull100 = merged.length === 1 && merged[0].start === 0 && merged[0].end === 100;

  return { mergedIntervals: merged, coveragePercent, isFull100 };
}


