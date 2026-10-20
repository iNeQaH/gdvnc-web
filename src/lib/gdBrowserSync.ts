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
 * Tự động đồng bộ stats (Star, Moon, Demon) từ GDBrowser khi có user đăng nhập xem profile:
 * - Điều kiện: người xem phải đã đăng nhập (viewer != null).
 * - Cooldown: 5 phút (300,000ms) tính từ lần cập nhật gần nhất.
 * - Tự động trao các badge Star Grinder (>= 10,000 stars), Moon Grinder (>= 5,000 moons), Demon Slayer (>= 500 demons).
 */
export async function syncUserGdBrowserStats(
  targetUser: {
    id: string;
    gdUsername?: string | null;
    gdStatsUpdatedAt?: Date | string | null;
    gdStars?: number;
    gdMoons?: number;
    gdDemons?: number;
  },
  viewerUser?: { id?: string; userId?: string } | null
): Promise<{ stars: number; moons: number; demons: number } | null> {
  const viewerId = viewerUser?.id || viewerUser?.userId;
  // Khách (chưa đăng nhập) không được kích hoạt cập nhật
  if (!viewerId) return null;

  if (!targetUser.gdUsername || !targetUser.gdUsername.trim()) return null;

  const now = Date.now();
  if (targetUser.gdStatsUpdatedAt) {
    const lastUpdate = new Date(targetUser.gdStatsUpdatedAt).getTime();
    if (now - lastUpdate < 5 * 60 * 1000) {
      // Đang trong thời gian cooldown 5 phút
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

    const stars = Math.max(0, parseInt(data.stars, 10) || 0);
    const moons = Math.max(0, parseInt(data.moons, 10) || 0);
    const demons = Math.max(0, parseInt(data.demons, 10) || 0);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        gdStars: stars,
        gdMoons: moons,
        gdDemons: demons,
        gdStatsUpdatedAt: new Date(),
      },
    });

    await checkAndAwardGrinderBadges(targetUser.id, stars, moons, demons);

    return { stars, moons, demons };
  } catch (err) {
    // GDBrowser timeout hoặc lỗi mạng: bỏ qua âm thầm
    return null;
  }
}
