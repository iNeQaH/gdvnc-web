import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode, Role } from '@prisma/client';
import {
  dedupeRecordsByLevel,
  isQualifyingClassicRecord,
  isQualifyingPlatformerRecord,
} from '@/lib/recordUtils';

export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://gdvnc-web.vercel.app';
}

export function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('data:')) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getSiteBaseUrl();
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
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
}

export async function getProfileEmbedData(username: string): Promise<ProfileEmbedData | null> {
  const decodedUsername = decodeURIComponent(username);

  const user = await prisma.user.findUnique({
    where: { username: decodedUsername },
    include: {
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
    .filter((r) => r.level.mode === LevelMode.CLASSIC && isQualifyingClassicRecord(r, r.level))
    .map((r) => ({
      name: r.level.name,
      placement: r.level.placement ?? 999,
    }));

  const platformerForPp = dedupedRecords
    .filter((r) => r.level.mode === LevelMode.PLATFORMER && isQualifyingPlatformerRecord(r))
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

  const isSupporter = Boolean(user.supporterUntil && new Date(user.supporterUntil) > new Date());
  const showBadgeRow = user.role !== Role.USER || badges.length > 0 || isSupporter;

  const pointLines: string[] = [];
  if (user.classicPp > 0) pointLines.push(`Classic: ${Math.floor(user.classicPp)}pt`);
  if (user.platformerPp > 0) pointLines.push(`Platformer: ${Math.floor(user.platformerPp)}pt`);
  if (user.creatorPoints > 0) pointLines.push(`Creator: ${Math.floor(user.creatorPoints)}pt`);

  const hardestLines: string[] = [];
  if (hardestClassic) hardestLines.push(`Classic Hardest: ${hardestClassic.name}`);
  if (hardestPlatformer) hardestLines.push(`Platformer Hardest: ${hardestPlatformer.name}`);

  return {
    username: user.username,
    role: user.role,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    classicPp: user.classicPp,
    platformerPp: user.platformerPp,
    creatorPoints: user.creatorPoints,
    supporterUntil: user.supporterUntil,
    badges,
    hardestClassic,
    hardestPlatformer,
    pointLines,
    hardestLines,
    showBadgeRow,
  };
}

export function buildProfileEmbedDescription(data: ProfileEmbedData) {
  const lines = [...data.pointLines, ...data.hardestLines];
  return lines.length > 0 ? lines.join(' · ') : `GDVNC profile — ${data.username}`;
}
