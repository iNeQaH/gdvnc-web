export const CLAN_TIER_CONFIG = {
  TIER_1: { minSp: 3, maxMembers: 5, hasGradient: false, name: 'Tier 1' },
  TIER_2: { minSp: 10, maxMembers: 15, hasGradient: true, name: 'Tier 2' },
  TIER_3: { minSp: 20, maxMembers: 50, hasGradient: true, name: 'Tier 3' },
  TIER_4: { minSp: 50, maxMembers: 100, hasGradient: true, name: 'Tier 4' },
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
    // Khi hết hạn Supporter, lập tức trừ tất cả SP Coin về 0 (kể cả trong Clan)
    return 0;
  }

  // Mỗi tháng Supporter (chu kỳ 30 ngày) tương đương 1 SP coin.
  // Khi giảm 1 tháng thì trừ 1 SP coin: dùng Math.ceil (còn (0, 30 ngày] = 1 SP, (30, 60 ngày] = 2 SP, v.v.)
  const baseSp = Math.max(1, Math.ceil(diff / (30 * 24 * 60 * 60 * 1000)));

  // SP Coin thưởng / đổi mã (UserSpGrant) chỉ có hiệu lực khi Supporter còn hạn
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
  if (spPoints >= 50) {
    return {
      tier: 4,
      name: CLAN_TIER_CONFIG.TIER_4.name,
      maxMembers: CLAN_TIER_CONFIG.TIER_4.maxMembers,
      hasGradient: CLAN_TIER_CONFIG.TIER_4.hasGradient,
      isSufficient: true,
    };
  }
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
