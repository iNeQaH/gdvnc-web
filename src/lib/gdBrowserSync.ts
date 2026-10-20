import prisma from '@/lib/prisma';

export async function checkAndAwardGrinderBadges(
  userId: string,
  stars: number,
  moons: number,
  demons: number
): Promise<void> {
  try {
    const keysToAward: string[] = [];
    if (stars >= 10000) keysToAward.push('GRINDER_STAR');
    if (moons >= 5000) keysToAward.push('GRINDER_MOON');
    if (demons >= 500) keysToAward.push('GRINDER_DEMON');

    if (keysToAward.length === 0) return;

    const badges = await prisma.badge.findMany({
      where: { systemKey: { in: keysToAward } },
      select: { id: true, systemKey: true },
    });

    for (const b of badges) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: b.id } },
        update: {},
        create: {
          userId,
          badgeId: b.id,
          assignedBy: 'SYSTEM_AUTO_GRINDER',
        },
      });
    }
  } catch (err) {
    console.error('checkAndAwardGrinderBadges error:', err);
  }
}

/**
 * Tự động đồng bộ stats (Star, Moon, Demon, Creator Points) từ GDBrowser khi có user đăng nhập xem profile:
 * - Điều kiện: người xem phải đã đăng nhập (viewer != null).
 * - Cooldown: 5 phút (300,000ms) tính từ lần cập nhật gần nhất.
 * - Chỉ những người có global rank trong GDBrowser (rank >= 1) mới được chấp nhận lấy điểm Stars, Moons và Demons.
 * - Nếu không có global rank (rank = 0 hoặc unranked), stars/moons/demons không được chấp nhận (= 0) và gỡ badge Grinder tự động.
 * - Creator Points (CP) vẫn được lấy từ GDBrowser nếu có.
 */
export async function syncUserGdBrowserStats(
  targetUser: {
    id: string;
    gdUsername?: string | null;
    gdStatsUpdatedAt?: Date | string | null;
    gdHasGlobalRank?: boolean | null;
    gdStars?: number;
    gdMoons?: number;
    gdDemons?: number;
    creatorPoints?: number;
  },
  viewerUser?: { id?: string; userId?: string } | null,
  force = false
): Promise<{ stars: number; moons: number; demons: number; cp: number; rank: number; hasGlobalRank: boolean } | null> {
  const viewerId = viewerUser?.id || viewerUser?.userId;
  // Khách (chưa đăng nhập) không được kích hoạt cập nhật (trừ khi force = true)
  if (!viewerId && !force) return null;

  if (!targetUser.gdUsername || !targetUser.gdUsername.trim()) return null;

  const now = Date.now();
  if (!force && targetUser.gdStatsUpdatedAt) {
    const lastUpdate = new Date(targetUser.gdStatsUpdatedAt).getTime();
    // Nếu đã fetch 1 lần mà không thấy có global rank thì 72 giờ tiếp theo không cần fetch nữa
    // Nếu có global rank bình thường: cooldown 5 phút
    const cooldownMs = targetUser.gdHasGlobalRank === false ? 72 * 60 * 60 * 1000 : 5 * 60 * 1000;
    if (now - lastUpdate < cooldownMs) {
      // Đang trong thời gian cooldown
      return null;
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`https://gdbrowser.com/api/profile/${encodeURIComponent(targetUser.gdUsername.trim())}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GDVN-Web/2.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;

    // Kiểm tra global rank từ GDBrowser: chỉ chấp nhận khi có rank và rank >= 1
    const rawRank = data.rank !== undefined && data.rank !== null ? parseInt(String(data.rank), 10) : 0;
    const hasGlobalRank = !isNaN(rawRank) && rawRank >= 1;

    // Chỉ những người có global rank mới được chấp nhận lấy điểm stars, moons và demons
    const stars = hasGlobalRank ? Math.max(0, parseInt(data.stars, 10) || 0) : 0;
    const moons = hasGlobalRank ? Math.max(0, parseInt(data.moons, 10) || 0) : 0;
    const demons = hasGlobalRank ? Math.max(0, parseInt(data.demons, 10) || 0) : 0;
    const cp = data.cp !== undefined ? Math.max(0, parseInt(data.cp, 10) || 0) : Math.max(0, targetUser.creatorPoints || 0);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        gdStars: stars,
        gdMoons: moons,
        gdDemons: demons,
        creatorPoints: cp,
        gdHasGlobalRank: hasGlobalRank,
        gdStatsUpdatedAt: new Date(),
      },
    });

    if (hasGlobalRank) {
      await checkAndAwardGrinderBadges(targetUser.id, stars, moons, demons);
    } else {
      // Nếu không có global rank, gỡ bỏ các badge Grinder đã tự động trao trước đó
      try {
        const grinderBadges = await prisma.badge.findMany({
          where: { systemKey: { in: ['GRINDER_STAR', 'GRINDER_MOON', 'GRINDER_DEMON'] } },
          select: { id: true },
        });
        if (grinderBadges.length > 0) {
          await prisma.userBadge.deleteMany({
            where: {
              userId: targetUser.id,
              badgeId: { in: grinderBadges.map((b) => b.id) },
              assignedBy: 'SYSTEM_AUTO_GRINDER',
            },
          });
        }
      } catch (e) {
        console.error('cleanup grinder badges error:', e);
      }
    }

    return { stars, moons, demons, cp, rank: hasGlobalRank ? rawRank : 0, hasGlobalRank };
  } catch (err) {
    // GDBrowser timeout hoặc lỗi mạng: bỏ qua âm thầm
    return null;
  }
}
