import prisma from '@/lib/prisma';
import { getVnWeekString, getVnPreviousWeekString } from './activityPoints';
import { playerDisplayName, clearLeaderboardCache } from './leaderboard';
import { bustPublicCache, CACHE_TAGS } from './publicCache';

export interface RecapPlayer {
  userId: string;
  username: string;
  displayName: string;
  clanTag: string | null;
  points: number;
  streak: number;
}

export interface RecapClan {
  clanId: string;
  name: string;
  tag: string | null;
  slug: string;
  points: number;
  streak: number;
}

/**
 * Tính số thứ tự tuần N kể từ tuần bắt đầu '2026-W45' (Tuần 1).
 */
export function getWeekNumberFromWeekString(weekStr: string): number {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return 1;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  if (year === 2026) {
    return Math.max(1, week - 45 + 1);
  }
  const yearsDiff = year - 2026;
  return (52 - 45 + 1) + (yearsDiff - 1) * 52 + week;
}

/**
 * Định dạng nội dung bài đăng HomePost và thông báo SiteAnnouncement theo quy chuẩn
 */
export function formatWeeklyRecapPost(
  weekNumber: number,
  topPlayers: RecapPlayer[],
  topClans: RecapClan[]
) {
  const activePlayers = (topPlayers || []).filter((p) => p.points > 0);
  const activeClans = (topClans || []).filter((c) => c.points > 0);

  if (activePlayers.length === 0 && activeClans.length === 0) {
    return { postTitle: '', postBody: '', notifTitle: '', notifExcerpt: '', notifBody: '', isEmpty: true };
  }

  const weekTitle = weekNumber === 1 ? 'Tuần đầu tiên' : `Tuần thứ ${weekNumber}`;
  const title = `# ${weekTitle} đã kết thúc! Chúc mừng top 5 của tuần này!`;
  const resultHeader = weekNumber === 1 ? '# **Kết quả tuần đầu tiên:**' : `# **Kết quả của tuần thứ ${weekNumber}:**`;

  const playerLines = activePlayers.map((p, idx) => {
    const rankNum = idx + 1;
    const clanPrefix = p.clanTag ? `[${p.clanTag}] ` : '';
    const itemText = `${clanPrefix}[${p.displayName}](https://geodat.vn/profile/${encodeURIComponent(p.username)}) - ${p.points.toLocaleString('en-US')} điểm (${p.streak}🔥)`;
    return rankNum === 1 ? `- **1. ${itemText}**` : `- ${rankNum}. ${itemText}`;
  });

  const clanLines = activeClans.map((c, idx) => {
    const rankNum = idx + 1;
    const clanPrefix = c.tag ? `[${c.tag}] ` : '';
    const itemText = `${clanPrefix}[${c.name}](https://geodat.vn/clan/${encodeURIComponent(c.slug)}) - ${c.points.toLocaleString('en-US')} điểm (${c.streak}🔥)`;
    return rankNum === 1 ? `- **1. ${itemText}**` : `- ${rankNum}. ${itemText}`;
  });

  const bodyParts: string[] = [resultHeader];

  if (playerLines.length > 0) {
    bodyParts.push('> Top 5 người chơi mạnh nhất:');
    bodyParts.push(...playerLines);
  }

  if (playerLines.length > 0 && clanLines.length > 0) {
    bodyParts.push('---');
  }

  if (clanLines.length > 0) {
    bodyParts.push('> Top 5 Clan mạnh nhất:');
    bodyParts.push(...clanLines);
  }

  bodyParts.push('*🔥 là số chuỗi có mặt trên BXH.*');

  const body = bodyParts.join('\n');
  const notifExcerpt = '🔥 là số chuỗi có mặt trên BXH.';

  return { postTitle: title, postBody: body, notifTitle: title, notifExcerpt, notifBody: body, isEmpty: false };
}

export function formatTimelineHtml(
  weekNumber: number,
  topPlayers: RecapPlayer[],
  topClans: RecapClan[]
): string {
  const activePlayers = (topPlayers || []).filter((p) => p.points > 0);
  const activeClans = (topClans || []).filter((c) => c.points > 0);

  if (activePlayers.length === 0 && activeClans.length === 0) {
    return '';
  }

  const resultHeader = weekNumber === 1 ? 'Kết quả tuần đầu tiên:' : `Kết quả của tuần thứ ${weekNumber}:`;

  const playerLis = activePlayers.map((p, idx) => {
    const rankNum = idx + 1;
    const clanPrefix = p.clanTag ? `[${p.clanTag}] ` : '';
    const itemText = `${clanPrefix}<a href="https://geodat.vn/profile/${encodeURIComponent(p.username)}">${p.displayName}</a> - ${p.points.toLocaleString('en-US')} điểm (${p.streak}🔥)`;
    return rankNum === 1 ? `<li><strong>1. ${itemText}</strong></li>` : `<li>${rankNum}. ${itemText}</li>`;
  }).join('\n');

  const clanLis = activeClans.map((c, idx) => {
    const rankNum = idx + 1;
    const clanPrefix = c.tag ? `[${c.tag}] ` : '';
    const itemText = `${clanPrefix}<a href="https://geodat.vn/clan/${encodeURIComponent(c.slug)}">${c.name}</a> - ${c.points.toLocaleString('en-US')} điểm (${c.streak}🔥)`;
    return rankNum === 1 ? `<li><strong>1. ${itemText}</strong></li>` : `<li>${rankNum}. ${itemText}</li>`;
  }).join('\n');

  const parts: string[] = [`<h2><strong>${resultHeader}</strong></h2>`];

  if (playerLis) {
    parts.push(`<blockquote>Top 5 người chơi mạnh nhất:</blockquote>`);
    parts.push(`<ul>\n${playerLis}\n</ul>`);
  }

  if (playerLis && clanLis) {
    parts.push(`<hr />`);
  }

  if (clanLis) {
    parts.push(`<blockquote>Top 5 Clan mạnh nhất:</blockquote>`);
    parts.push(`<ul>\n${clanLis}\n</ul>`);
  }

  parts.push(`<p><em>🔥 là số chuỗi có mặt trên BXH.</em></p>`);

  return parts.join('\n');
}

/**
 * Chốt và xuất bản tổng kết tuần (HomePost + SiteAnnouncement)
 * Có cơ chế Idempotent chống trùng lặp qua bảng WeeklyActivityRecap
 */
export async function runWeeklyRecapForWeek(targetWeek: string, explicitData?: { topPlayers: RecapPlayer[]; topClans: RecapClan[] }) {
  // 1. Kiểm tra xem tuần này đã được tổng kết chưa
  const existing = await prisma.weeklyActivityRecap.findUnique({
    where: { weekString: targetWeek },
  });
  if (existing) {
    return { success: true, alreadyExists: true, recap: existing };
  }

  const weekNumber = getWeekNumberFromWeekString(targetWeek);

  // 2. Lấy dữ liệu streak từ tuần trước
  let prevPlayerStreaks = new Map<string, number>();
  let prevClanStreaks = new Map<string, number>();

  if (weekNumber > 1) {
    const prevRecap = await prisma.weeklyActivityRecap.findFirst({
      where: { weekNumber: weekNumber - 1 },
    });
    if (prevRecap) {
      if (Array.isArray(prevRecap.topPlayers)) {
        for (const p of prevRecap.topPlayers as any[]) {
          if (p.userId) prevPlayerStreaks.set(p.userId, p.streak || 1);
        }
      }
      if (Array.isArray(prevRecap.topClans)) {
        for (const c of prevRecap.topClans as any[]) {
          if (c.clanId) prevClanStreaks.set(c.clanId, c.streak || 1);
        }
      }
    }
  }

  let finalTopPlayers: RecapPlayer[] = [];
  let finalTopClans: RecapClan[] = [];

  if (explicitData) {
    finalTopPlayers = explicitData.topPlayers;
    finalTopClans = explicitData.topClans;
  } else {
    // 3. Truy vấn Top 5 cá nhân của tuần targetWeek
    const players = await prisma.user.findMany({
      where: {
        activityDate: targetWeek,
        activityPoints: { gt: 0 },
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        activityPoints: true,
        clanMember: {
          select: {
            clan: { select: { tag: true } }
          }
        }
      },
      orderBy: [
        { activityPoints: 'desc' },
        { gdStars: 'desc' },
        { username: 'asc' }
      ],
      take: 5,
    });

    finalTopPlayers = players.map((p) => {
      const prevStreak = prevPlayerStreaks.get(p.id) || 0;
      return {
        userId: p.id,
        username: p.username,
        displayName: playerDisplayName(p),
        clanTag: p.clanMember?.clan?.tag || null,
        points: p.activityPoints,
        streak: prevStreak + 1,
      };
    });

    // 4. Truy vấn Top 5 Clan (tổng điểm top 5 thành viên trong tuần targetWeek)
    const clans = await prisma.clan.findMany({
      where: { isSuspended: false },
      select: {
        id: true,
        name: true,
        tag: true,
        slug: true,
        members: {
          select: {
            user: {
              select: {
                activityPoints: true,
                activityDate: true,
              }
            }
          }
        }
      }
    });

    const clanScoreList: RecapClan[] = [];
    for (const c of clans) {
      const memberPts: number[] = [];
      for (const m of c.members) {
        if (m.user && m.user.activityDate === targetWeek) {
          memberPts.push(m.user.activityPoints || 0);
        }
      }
      memberPts.sort((a, b) => b - a);
      const top5Sum = memberPts.slice(0, 5).reduce((a, b) => a + b, 0);
      if (top5Sum > 0) {
        const prevStreak = prevClanStreaks.get(c.id) || 0;
        clanScoreList.push({
          clanId: c.id,
          name: c.name,
          tag: c.tag,
          slug: c.slug,
          points: top5Sum,
          streak: prevStreak + 1,
        });
      }
    }
    clanScoreList.sort((a, b) => b.points - a.points);
    finalTopClans = clanScoreList.slice(0, 5);
  }

  // Lọc chỉ giữ lại người chơi và clan có điểm > 0
  finalTopPlayers = finalTopPlayers.filter((p) => p.points > 0);
  finalTopClans = finalTopClans.filter((c) => c.points > 0);

  // Thu thập danh sách toàn bộ người chơi có điểm hoạt động trong tuần để lưu allPlayers
  const allActiveUsers = await prisma.user.findMany({
    where: {
      activityDate: targetWeek,
      activityPoints: { gt: 0 },
      isBanned: false,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      activityPoints: true,
      gdStars: true,
      gdMoons: true,
      gdDemons: true,
      activityPrevStars: true,
      activityPrevMoons: true,
      activityPrevDemons: true,
      clanMember: {
        select: {
          clan: {
            select: {
              name: true,
              tag: true,
              slug: true,
            }
          }
        }
      }
    },
    orderBy: [
      { activityPoints: 'desc' },
      { gdStars: 'desc' },
      { username: 'asc' },
    ],
  });

  const finalAllPlayers = allActiveUsers.map((u) => {
    const starsGained = Math.max(0, (u.gdStars || 0) - (u.activityPrevStars || 0));
    const moonsGained = Math.max(0, (u.gdMoons || 0) - (u.activityPrevMoons || 0));
    const demonsGained = Math.max(0, (u.gdDemons || 0) - (u.activityPrevDemons || 0));

    return {
      userId: u.id,
      username: u.username,
      displayName: playerDisplayName(u),
      clanTag: u.clanMember?.clan?.tag || null,
      clanName: u.clanMember?.clan?.name || null,
      clanSlug: u.clanMember?.clan?.slug || null,
      points: u.activityPoints,
      starsGained,
      moonsGained,
      demonsGained,
    };
  });

  // 5. Chuẩn bị định dạng bài viết & thông báo
  const { postTitle, postBody, notifTitle, notifExcerpt, notifBody, isEmpty } = formatWeeklyRecapPost(
    weekNumber,
    finalTopPlayers,
    finalTopClans
  );

  // Nếu cả BXH người chơi và clan đều không có ai có điểm > 0: không đăng thông báo hay bài viết
  if (isEmpty) {
    const recap = await prisma.weeklyActivityRecap.create({
      data: {
        weekString: targetWeek,
        weekNumber,
        topPlayers: [],
        topClans: [],
        allPlayers: [],
        homePostId: null,
        announcementId: null,
      },
    });
    return { success: true, recap, skippedPublish: true };
  }

  // Tìm tác giả ưu tiên iNeQaH, fallback ADMIN
  const author = await prisma.user.findFirst({
    where: { username: { equals: 'iNeQaH', mode: 'insensitive' } },
    select: { id: true },
  }) || await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  // 6. Ghi nguyên tử vào Database: HomePost (báo mới) + TimelineEvent + WeeklyActivityRecap (không đăng vào SiteAnnouncement)
  const result = await prisma.$transaction(async (tx) => {
    // A. Tạo bài đăng HomePost (báo mới nổi bật, được ghim lên đầu)
    const post = await tx.homePost.create({
      data: {
        title: postTitle,
        body: postBody,
        authorId: author?.id || null,
        isPinned: true,
      },
    });

    // B. Tự động đồng bộ sang Timeline (/timeline)
    await tx.timelineEvent.upsert({
      where: { sourceKey: `weekly-recap:${targetWeek}` },
      create: {
        sourceKey: `weekly-recap:${targetWeek}`,
        title: `${weekNumber === 1 ? 'Tuần đầu tiên' : `Tuần thứ ${weekNumber}`} đã kết thúc!`,
        shortDescription: notifExcerpt,
        fullDescription: formatTimelineHtml(weekNumber, finalTopPlayers, finalTopClans),
        startAt: new Date(),
        endAt: new Date(),
        tier: 'week',
        nature: 'positive',
        glowColor: '#f59e0b',
      },
      update: {
        title: `${weekNumber === 1 ? 'Tuần đầu tiên' : `Tuần thứ ${weekNumber}`} đã kết thúc!`,
        shortDescription: notifExcerpt,
        fullDescription: formatTimelineHtml(weekNumber, finalTopPlayers, finalTopClans),
      },
    });

    // C. Lưu lịch sử tổng kết tuần (announcementId = null do không đăng thông báo)
    const recap = await tx.weeklyActivityRecap.create({
      data: {
        weekString: targetWeek,
        weekNumber,
        topPlayers: finalTopPlayers as any,
        topClans: finalTopClans as any,
        allPlayers: finalAllPlayers as any,
        homePostId: post.id,
        announcementId: null,
      },
    });

    return { post, recap };
  });

  // Xoá cache để cập nhật ngay trang chủ, timeline và bảng thông báo
  clearLeaderboardCache();
  bustPublicCache(CACHE_TAGS.home, CACHE_TAGS.highlights, CACHE_TAGS.leaderboard, CACHE_TAGS.timeline);

  return { success: true, ...result };
}

/**
 * Kiểm tra xem tuần vừa kết thúc đã có recap chưa; nếu chưa thì tự động chạy (Lazy Guard / Cron trigger).
 */
export async function checkAndTriggerWeeklyReset(nowMs: number = Date.now()) {
  const endingWeek = getVnPreviousWeekString(nowMs);
  const existing = await prisma.weeklyActivityRecap.findUnique({
    where: { weekString: endingWeek },
    select: { id: true },
  });

  if (!existing) {
    // Chưa có recap cho tuần vừa kết thúc -> tiến hành tổng kết
    return await runWeeklyRecapForWeek(endingWeek);
  }

  return { success: true, alreadyExists: true };
}
