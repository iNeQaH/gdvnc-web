import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import prisma from '@/lib/prisma';
import { getSiteBaseUrl, toAbsoluteUrl } from '@/lib/profileEmbed';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';

export function getClanEmbedThemeColor(clan?: {
  themeColor?: string | null;
  color?: string | null;
  themeGradient?: string | null;
  colorGradient?: string | null;
} | null): string {
  if (!clan) return '#0ea5e9';
  for (const field of [clan.themeColor, clan.themeGradient, clan.colorGradient, clan.color]) {
    if (field) {
      const match = String(field).match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
      if (match) return `#${match[1]}`;
    }
  }
  return '#0ea5e9';
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { color: true, themeColor: true, themeGradient: true, colorGradient: true },
  });
  return {
    themeColor: getClanEmbedThemeColor(clan),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      tag: true,
      name: true,
      description: true,
      coverUrl: true,
      avatarUrl: true,
      color: true,
      themeColor: true,
      themeGradient: true,
      colorGradient: true,
      leader: {
        select: { username: true },
      },
      _count: {
        select: { members: true },
      },
      members: {
        select: { userId: true },
      },
      contributions: {
        select: {
          userId: true,
          spPledged: true,
          user: {
            select: {
              supporterUntil: true,
              spGrants: { select: { amount: true, expiresAt: true } },
            },
          },
        },
      },
    },
  });

  if (!clan) {
    return {
      title: 'Clan không tồn tại | GDVN',
      description: 'Không tìm thấy clan này.',
    };
  }

  // Calculate clan SP & Tier
  const memberIds = new Set((clan.members || []).map((m) => m.userId));
  let totalSp = 0;
  for (const contrib of clan.contributions || []) {
    if (!memberIds.has(contrib.userId)) continue;
    const userMax = calculateUserSp(contrib.user);
    totalSp += Math.min(contrib.spPledged, userMax);
  }
  const tierInfo = getClanTier(totalSp);

  // Title: "{clan.tag} {clan.name} - {clan.tier}"
  const rawTag = clan.tag?.trim() || '';
  const displayTag = rawTag ? (rawTag.startsWith('[') ? rawTag : `[${rawTag}]`) : '';
  const title = displayTag ? `${displayTag} ${clan.name} - ${tierInfo.name}` : `${clan.name} - ${tierInfo.name}`;

  // Description: "Leader: {clan.leader} |  Member: {clan.total.members}"
  const leaderUsername = clan.leader?.username || 'Chưa có';
  const totalMembers = clan._count?.members ?? 0;
  const description = `Leader: ${leaderUsername} |  Member: ${totalMembers}`;

  const base = getSiteBaseUrl();
  const rawImage = clan.avatarUrl || clan.coverUrl;
  const imageUrl = rawImage ? toAbsoluteUrl(rawImage) : undefined;
  const themeColor = getClanEmbedThemeColor(clan);

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${base}/clan/${encodeURIComponent(slug)}`,
      siteName: 'GDVN',
      locale: 'vi_VN',
      images: imageUrl ? [{ url: imageUrl, width: 256, height: 256, alt: clan.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    other: {
      'theme-color': themeColor,
    },
  };
}

export default function ClanDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
