import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import prisma from '@/lib/prisma';
import { getSiteBaseUrl, toAbsoluteUrl } from '@/lib/profileEmbed';

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const clan = await prisma.clan.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { color: true, themeColor: true },
  });
  return {
    themeColor: clan?.themeColor || clan?.color || '#0ea5e9',
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
    },
  });

  if (!clan) {
    return {
      title: 'Clan không tồn tại | GDVN',
      description: 'Không tìm thấy clan này.',
    };
  }

  const title = clan.tag || clan.name;
  const description = clan.description?.trim() || 'Clan trong GDVN';
  const base = getSiteBaseUrl();
  const rawImage = clan.coverUrl || clan.avatarUrl;
  const imageUrl = rawImage ? toAbsoluteUrl(rawImage) : undefined;
  const themeColor = clan.themeColor || clan.color || '#0ea5e9';

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
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: clan.coverUrl ? 'summary_large_image' : 'summary',
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
