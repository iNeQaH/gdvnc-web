import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode, Role } from '@prisma/client';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/lib/recordUtils';
import { isSuperAdminUser } from '@/lib/roles';

export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  return 'https://geodat.vn';
}

export function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('data:')) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = getSiteBaseUrl();
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export function profileEmbedImageUrl(avatarUrl: string | null | undefined, username: string) {
  const abs = toAbsoluteUrl(avatarUrl);
  if (abs) return abs;
  if (avatarUrl) {
    return `${getSiteBaseUrl()}/api/avatars/${encodeURIComponent(username)}`;
  }
  return null;
}

export function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Math.ceil(base64.length * 3 / 4);
}

export interface ProfileEmbedData {
  username: string;
  role: Role;
  avatarUrl: string | null;
  coverUrl: string | null;
  classicPp: number;
  platformerPp: number;
  creatorPoints: number;
  supporterUntil: Date | null;
  badges: Array<{ color: string; icon: string }>;
  hardestClassic: { name: string } | null;
  hardestPlatformer: { name: string } | null;
  pointLines: string[];
  hardestLines: string[];
  showBadgeRow: boolean;
  clanTag?: string | null;
  rankClassic?: number | null;
  rankPlatformer?: number | null;
  rankCreator?: number | null;
  themeColor: string;
  bio?: string | null;
  title: string;
  description: string;
}

export async function getProfileEmbedData(username: string): Promise<ProfileEmbedData | null> {
  const decodedUsername = decodeURIComponent(username);

  const user = await prisma.user.findUnique({
    where: { username: decodedUsername },
    include: {
      clanMember: {
        include: {
          clan: {
            select: {
              tag: true,
              name: true,
              isSuspended: true,
            },
          },
        },
      },
      records: {
        where: { status: RecordStatus.APPROVED },
        include: { level: true },
      },
      userBadges: {
        include: { badge: true },
      },
    },
  });

  if (!user) return null;

  const dedupedRecords = dedupeRecordsByLevel(user.records);

  const classicForPp = dedupedRecords
    .filter((r) => !r.level.isChallenge && r.level.mode === LevelMode.CLASSIC && isQualifyingClassicRecord(r, r.level))
    .map((r) => ({
      name: r.level.name,
      placement: r.level.placement ?? 999,
    }));

  const platformerForPp = dedupedRecords
    .filter((r) => !r.level.isChallenge && r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
    .map((r) => ({
      name: r.level.name,
      placement: r.level.placement ?? 999,
    }));

  const hardestClassic =
    classicForPp.length > 0
      ? [...classicForPp].sort((a, b) => a.placement - b.placement)[0]
      : null;

  const hardestPlatformer =
    platformerForPp.length > 0
      ? [...platformerForPp].sort((a, b) => a.placement - b.placement)[0]
      : null;

  const badges = user.userBadges
    .slice()
    .sort((a, b) => (a.badge.sortOrder ?? 0) - (b.badge.sortOrder ?? 0))
    .map((ub) => ({
      color: ub.badge.color || '#0ea5e9',
      icon: ub.badge.icon || 'star',
    }));

  const isSuperAdmin = isSuperAdminUser(user);
  const isSupporter = Boolean(user.supporterUntil && new Date(user.supporterUntil) > new Date());
  const roleBadges = [];
  if (isSuperAdmin) {
    roleBadges.push({ color: '#ef4444', icon: 'Crown' });
  } else if (user.role === Role.ADMIN) {
    roleBadges.push({ color: '#ef4444', icon: 'Shield' });
  } else if (user.role === Role.MODERATOR) {
    roleBadges.push({ color: '#22c55e', icon: 'ShieldCheck' });
  }
  if (isSupporter) {
    roleBadges.push({ color: '#ec4899', icon: 'Heart' });
  }

  const allBadges = [...roleBadges, ...badges];
  const showBadgeRow = user.role !== Role.USER || allBadges.length > 0 || isSupporter;

  const pointLines: string[] = [];
  if (user.classicPp > 0) pointLines.push(`Classic: ${Math.floor(user.classicPp)}pt`);
  if (user.platformerPp > 0) pointLines.push(`Platformer: ${Math.floor(user.platformerPp)}pt`);
  if (user.creatorPoints > 0) pointLines.push(`Creator: ${Math.floor(user.creatorPoints)}pt`);

  const hardestLines: string[] = [];
  if (hardestClassic) hardestLines.push(`Classic Hardest: ${hardestClassic.name}`);
  if (hardestPlatformer) hardestLines.push(`Platformer Hardest: ${hardestPlatformer.name}`);

  // Query ranks for categories where points > 0
  const [rankClassic, rankPlatformer, rankCreator] = await Promise.all([
    user.classicPp > 0.005
      ? prisma.user.count({ where: { isBanned: false, classicPp: { gt: user.classicPp } } }).then((c) => c + 1)
      : Promise.resolve(null),
    user.platformerPp > 0.005
      ? prisma.user.count({ where: { isBanned: false, platformerPp: { gt: user.platformerPp } } }).then((c) => c + 1)
      : Promise.resolve(null),
    user.creatorPoints > 0.005
      ? prisma.user.count({ where: { isBanned: false, creatorPoints: { gt: user.creatorPoints } } }).then((c) => c + 1)
      : Promise.resolve(null),
  ]);

  const clan = user.clanMember?.clan;
  const clanTag = clan && !clan.isSuspended && clan.tag ? clan.tag : null;

  // Title: "[{clan.tag}] {username}" if clan exists, else "{username}"
  const title = clanTag ? `[${clanTag}] ${user.username}` : user.username;

  // Description: "Classic: #{rank classic} | Platformer: #{rank platformer} | Creator: #{rank creator}"
  // ONLY include items where points > 0!
  const rankParts: string[] = [];
  if (rankClassic !== null) rankParts.push(`Classic: #${rankClassic}`);
  if (rankPlatformer !== null) rankParts.push(`Platformer: #${rankPlatformer}`);
  if (rankCreator !== null) rankParts.push(`Creator: #${rankCreator}`);

  const description = rankParts.length > 0 ? rankParts.join(' | ') : (user.bio?.trim() || 'Hồ sơ người chơi GDVN');

  // Determine user's active theme color for Discord embed border
  let themeColor = '#0ea5e9';
  if (user.profileTheme === 'sakura') themeColor = '#ec4899';
  else if (user.profileTheme === 'lavender') themeColor = '#a855f7';
  else if (user.profileTheme === 'mint') themeColor = '#10b981';
  else if (user.profileTheme === 'peach') themeColor = '#f43f5e';
  else if (user.profileTheme === 'mono') themeColor = '#71717a';
  else if (user.profileTheme === 'custom') {
    const cfg = user.profileConfig as any;
    if (cfg?.customThemeColors?.[0]) themeColor = cfg.customThemeColors[0];
    else if (cfg?.customThemeColor) themeColor = cfg.customThemeColor;
  } else if (user.nameColor && user.nameColor.startsWith('#')) {
    themeColor = user.nameColor;
  }

  return {
    username: user.username,
    role: isSuperAdmin ? ('SUPER_ADMIN' as any) : user.role,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    classicPp: user.classicPp,
    platformerPp: user.platformerPp,
    creatorPoints: user.creatorPoints,
    supporterUntil: user.supporterUntil,
    badges: allBadges,
    hardestClassic,
    hardestPlatformer,
    pointLines,
    hardestLines,
    showBadgeRow,
    clanTag,
    rankClassic,
    rankPlatformer,
    rankCreator,
    themeColor,
    bio: user.bio,
    title,
    description,
  };
}

export function buildProfileEmbedDescription(data: ProfileEmbedData) {
  return data.description;
}
