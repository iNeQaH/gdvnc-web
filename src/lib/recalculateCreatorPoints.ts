import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

const CREATOR_ROLE_KEYS = [
  'CREATOR_MYTHIC',
  'CREATOR_LEGENDARY',
  'CREATOR_EPIC',
  'CREATOR_FEATURED',
  'CREATOR_STAR',
] as const;

/**
 * Tự động tính Creator Points và xét gán Role Creator:
 * - Khớp các màn chơi trong DB GDVN mà creatorName trùng với user.gdUsername (không phân biệt hoa thường).
 * - Điểm CP theo rating: Mythic=5, Legendary=4, Epic=3, Feature=2, Star=1.
 * - Tự động trao Role Creator tương ứng với level có phẩm chất cao nhất mà user sở hữu.
 */
export async function recalculateCreatorPoints(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, gdUsername: true },
  });
  if (!user) return 0;

  // 1. Điểm từ approved CreatorWork (nếu có cấp thủ công)
  const works = await prisma.creatorWork.findMany({
    where: { userId, status: RecordStatus.APPROVED },
    select: { cpGranted: true },
  });
  const workCp = works.reduce((sum, work) => sum + (work.cpGranted || 0), 0);

  // 2. Điểm từ các level trong DB có creatorName trùng khớp gdUsername
  let levelCp = 0;
  let highestRating: string | null = null;

  if (user.gdUsername && user.gdUsername.trim()) {
    const matchedLevels = await prisma.level.findMany({
      where: {
        creatorName: {
          equals: user.gdUsername.trim(),
          mode: 'insensitive',
        },
      },
      select: { ratingType: true },
    });

    for (const lvl of matchedLevels) {
      const r = (lvl.ratingType || '').toUpperCase().trim();
      if (r === 'MYTHIC') {
        levelCp += 5;
        highestRating = 'MYTHIC';
      } else if (r === 'LEGENDARY') {
        levelCp += 4;
        if (highestRating !== 'MYTHIC') highestRating = 'LEGENDARY';
      } else if (r === 'EPIC') {
        levelCp += 3;
        if (!['MYTHIC', 'LEGENDARY'].includes(highestRating || '')) highestRating = 'EPIC';
      } else if (r === 'FEATURE' || r === 'FEATURED') {
        levelCp += 2;
        if (!['MYTHIC', 'LEGENDARY', 'EPIC'].includes(highestRating || '')) highestRating = 'FEATURED';
      } else if (r === 'RATE' || r === 'STAR' || r === 'RATED') {
        levelCp += 1;
        if (!['MYTHIC', 'LEGENDARY', 'EPIC', 'FEATURED'].includes(highestRating || '')) highestRating = 'STAR';
      }
    }
  }

  const total = Math.round((workCp + levelCp) * 10) / 10;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { creatorPoints: total },
    });

    // 3. Tự động gán Role Creator theo phẩm chất level cao nhất
    let targetSystemKey: string | null = null;
    if (highestRating === 'MYTHIC') targetSystemKey = 'CREATOR_MYTHIC';
    else if (highestRating === 'LEGENDARY') targetSystemKey = 'CREATOR_LEGENDARY';
    else if (highestRating === 'EPIC') targetSystemKey = 'CREATOR_EPIC';
    else if (highestRating === 'FEATURED') targetSystemKey = 'CREATOR_FEATURED';
    else if (highestRating === 'STAR') targetSystemKey = 'CREATOR_STAR';

    // Lấy ID của các Creator badges trong hệ thống
    const creatorBadges = await prisma.badge.findMany({
      where: { systemKey: { in: [...CREATOR_ROLE_KEYS] } },
      select: { id: true, systemKey: true },
    });

    const badgeMap = new Map<string, string>(); // systemKey -> badgeId
    for (const b of creatorBadges) {
      if (b.systemKey) badgeMap.set(b.systemKey, b.id);
    }

    const allCreatorBadgeIds = creatorBadges.map((b) => b.id);

    if (targetSystemKey && badgeMap.has(targetSystemKey)) {
      const targetBadgeId = badgeMap.get(targetSystemKey)!;
      // Xoá các badge Creator khác nếu đang gán
      const otherBadgeIds = allCreatorBadgeIds.filter((bid) => bid !== targetBadgeId);
      if (otherBadgeIds.length > 0) {
        await prisma.userBadge.deleteMany({
          where: {
            userId,
            badgeId: { in: otherBadgeIds },
          },
        });
      }
      // Gán role cao nhất nếu chưa có
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: targetBadgeId } },
        update: {},
        create: {
          userId,
          badgeId: targetBadgeId,
          assignedBy: 'SYSTEM_AUTO_CREATOR',
        },
      });
    } else if (!targetSystemKey && allCreatorBadgeIds.length > 0) {
      // User không có level rate nào -> gỡ bỏ toàn bộ role creator tự động
      await prisma.userBadge.deleteMany({
        where: {
          userId,
          badgeId: { in: allCreatorBadgeIds },
          assignedBy: 'SYSTEM_AUTO_CREATOR',
        },
      });
    }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      console.warn(`recalculateCreatorPoints: User ${userId} not found.`);
      return total;
    }
    throw error;
  }

  return total;
}
