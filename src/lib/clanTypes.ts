export const CLAN_TIER_CONFIG = {
  TIER_1: { minSp: 3, maxMembers: 5, hasGradient: false, name: 'Tier 1' },
  TIER_2: { minSp: 10, maxMembers: 15, hasGradient: true, name: 'Tier 2' },
  TIER_3: { minSp: 20, maxMembers: 50, hasGradient: true, name: 'Tier 3' },
} as const;

/**
 * Tính số điểm SP Coin của người dùng dựa trên thời hạn Supporter còn lại.
 * Mỗi chu kỳ 30 ngày tương đương 1 điểm SP. Hết hạn = 0 SP.
 */
export function calculateUserSp(user?: { supporterUntil?: Date | string | null } | null): number {
  if (!user?.supporterUntil) return 0;
  const target = new Date(user.supporterUntil).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 0;
  return Math.max(1, Math.round(diff / (30 * 24 * 60 * 60 * 1000)));
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
