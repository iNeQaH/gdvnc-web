import prisma from '@/lib/prisma';

export const CREATOR_RANK_CONFIG = [
  { rating: 'MYTHIC', systemKey: 'CREATOR_MYTHIC', name: 'Mythic Creator' },
  { rating: 'LEGENDARY', systemKey: 'CREATOR_LEGENDARY', name: 'Legendary Creator' },
  { rating: 'EPIC', systemKey: 'CREATOR_EPIC', name: 'Epic Creator' },
  { rating: 'FEATURED', systemKey: 'CREATOR_FEATURED', name: 'Featured Creator' },
  { rating: 'STAR', systemKey: 'CREATOR_STAR', name: 'Rated Creator' },
] as const;

const ALL_CREATOR_KEYS = CREATOR_RANK_CONFIG.map((c) => c.systemKey);
const ALL_CREATOR_NAMES = CREATOR_RANK_CONFIG.map((c) => c.name);

/**
 * Tự động xét duyệt và gán Role Creator theo phẩm chất level cao nhất của user trong DB:
 * - Khớp các màn chơi trong DB GDVN mà creatorId trùng userId hoặc creatorName trùng với user.gdUsername (không phân biệt hoa thường).
 * - Thứ bậc ưu tiên: Mythic > Legendary > Epic > Featured > Rated (Star).
 * - Quy tắc bắt buộc: Có cấp cao hơn thì TỰ ĐỘNG GỠ BỎ toàn bộ các cấp thấp hơn (ví dụ có Epic thì bỏ Featured và Rated).
 * - Nếu không còn level nào được xếp hạng: tự động gỡ bỏ toàn bộ huy hiệu Creator.
 * - Creator Points (CP) của user được đồng bộ chính thức từ GDBrowser (không tính/ghi đè từ web).
 */
export async function recalculateCreatorPoints(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, gdUsername: true, creatorPoints: true },
  });
  if (!user) return 0;

  const names = [user.gdUsername?.trim(), user.username?.trim()].filter(Boolean) as string[];

  const matchedLevels = await prisma.level.findMany({
    where: {
      OR: [
        { creatorId: userId },
        ...names.map((name) => ({
          creatorName: { equals: name, mode: 'insensitive' as const },
        })),
      ],
    },
    select: { ratingType: true },
  });

  let highestRank: 'MYTHIC' | 'LEGENDARY' | 'EPIC' | 'FEATURED' | 'STAR' | null = null;

  for (const lvl of matchedLevels) {
    const r = (lvl.ratingType || '').toUpperCase().trim();
    if (r === 'MYTHIC') {
      highestRank = 'MYTHIC';
      break;
    } else if (r === 'LEGENDARY') {
      if (!highestRank || ['EPIC', 'FEATURED', 'STAR'].includes(highestRank)) {
        highestRank = 'LEGENDARY';
      }
    } else if (r === 'EPIC') {
      if (!highestRank || ['FEATURED', 'STAR'].includes(highestRank)) {
        highestRank = 'EPIC';
      }
    } else if (r === 'FEATURE' || r === 'FEATURED') {
      if (!highestRank || highestRank === 'STAR') {
        highestRank = 'FEATURED';
      }
    } else if (r === 'RATE' || r === 'STAR' || r === 'RATED') {
      if (!highestRank) {
        highestRank = 'STAR';
      }
    }
  }

  try {
    // 1. Tìm toàn bộ các huy hiệu Creator trong hệ thống (cả theo systemKey lẫn theo tên để tránh sót)
    const allCreatorBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { systemKey: { in: [...ALL_CREATOR_KEYS] } },
          { name: { in: [...ALL_CREATOR_NAMES] } },
        ],
      },
      select: { id: true, systemKey: true, name: true },
    });

    let targetBadgeId: string | null = null;

    if (highestRank) {
      const config = CREATOR_RANK_CONFIG.find((c) => c.rating === highestRank);
      if (config) {
        // Ưu tiên tìm badge có systemKey khớp, nếu không có thì tìm theo name
        const match =
          allCreatorBadges.find((b) => b.systemKey === config.systemKey) ||
          allCreatorBadges.find((b) => b.name === config.name);
        if (match) targetBadgeId = match.id;
      }
    }

    // 2. GỠ BỎ TẤT CẢ các huy hiệu Creator khác (bất kể thấp hơn hay trùng lặp)
    const otherBadgeIds = allCreatorBadges
      .filter((b) => !targetBadgeId || b.id !== targetBadgeId)
      .map((b) => b.id);

    if (otherBadgeIds.length > 0) {
      await prisma.userBadge.deleteMany({
        where: {
          userId,
          badgeId: { in: otherBadgeIds },
        },
      });
    }

    // 3. Trao DUY NHẤT 1 huy hiệu cao nhất nếu có
    if (targetBadgeId) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: targetBadgeId } },
        update: {},
        create: {
          userId,
          badgeId: targetBadgeId,
          assignedBy: 'SYSTEM_AUTO_CREATOR',
        },
      });
    }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      console.warn(`recalculateCreatorPoints: User ${userId} not found.`);
      return user.creatorPoints || 0;
    }
    console.error('recalculateCreatorPoints error:', error);
  }

  return user.creatorPoints || 0;
}
