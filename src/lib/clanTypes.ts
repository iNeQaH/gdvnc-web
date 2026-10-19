export const CLAN_TIER_CONFIG = {
  TIER_1: { minSp: 3, maxMembers: 5, hasGradient: false, name: 'Tier 1' },
  TIER_2: { minSp: 10, maxMembers: 15, hasGradient: true, name: 'Tier 2' },
  TIER_3: { minSp: 20, maxMembers: 50, hasGradient: true, name: 'Tier 3' },
} as const;

/**
 * Tính số điểm SP Coin của người dùng dựa trên thời hạn Supporter còn lại và các gói SP Coin đang có hiệu lực.
 * Mỗi chu kỳ 30 ngày Supporter tương đương 1 điểm SP. Kèm theo số SP Coin thưởng/đổi mã (UserSpGrant).
 * Toàn bộ SP Coin tồn tại đồng thời với thời hạn Supporter của người dùng, duy trì cố định cho tới khi hết hạn Supporter.
 */
export function calculateUserSp(
  user?: {
    supporterUntil?: Date | string | null;
    spGrants?: Array<{ amount: number; expiresAt?: Date | string }> | null;
  } | null
): number {
  if (!user?.supporterUntil) return 0;
  const target = new Date(user.supporterUntil).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    // Khi hết hạn Supporter, toàn bộ SP Coin không còn hiệu lực
    return 0;
  }

  // Số SP Coin cơ bản tương ứng với số tháng Supporter còn lại
  const baseSp = Math.max(1, Math.round(diff / (30 * 24 * 60 * 60 * 1000)));

  // SP Coin thưởng / đổi mã tồn tại đồng thời suốt thời gian người dùng là Supporter, không hết hạn sau 1 tháng
  let bonusSp = 0;
  if (user?.spGrants && Array.isArray(user.spGrants)) {
    for (const grant of user.spGrants) {
      bonusSp += Number(grant.amount) || 0;
    }
  }

  return Math.max(0, baseSp + bonusSp);
}

/**
 * Xác định cấp bậc Tier và giới hạn của Clan theo số điểm SP.
 */
export function getClanTier(spPoints: number) {
  if (spPoints >= 20) {
    return {
      tier: 3,
      name: CLAN_TIER_CONFIG.TIER_3.name,
      maxMembers: CLAN_TIER_CONFIG.TIER_3.maxMembers,
      hasGradient: CLAN_TIER_CONFIG.TIER_3.hasGradient,
      isSufficient: true,
    };
  }
  if (spPoints >= 10) {
    return {
      tier: 2,
      name: CLAN_TIER_CONFIG.TIER_2.name,
      maxMembers: CLAN_TIER_CONFIG.TIER_2.maxMembers,
      hasGradient: CLAN_TIER_CONFIG.TIER_2.hasGradient,
      isSufficient: true,
    };
  }
  if (spPoints >= 3) {
    return {
      tier: 1,
      name: CLAN_TIER_CONFIG.TIER_1.name,
      maxMembers: CLAN_TIER_CONFIG.TIER_1.maxMembers,
      hasGradient: CLAN_TIER_CONFIG.TIER_1.hasGradient,
      isSufficient: true,
    };
  }
  return {
    tier: 0,
    name: 'Không đủ duy trì',
    maxMembers: 5,
    hasGradient: false,
    isSufficient: false,
  };
}
