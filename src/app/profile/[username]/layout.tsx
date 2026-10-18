import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { getProfileEmbedData, getSiteBaseUrl, toAbsoluteUrl } from '@/lib/profileEmbed';

export async function generateViewport({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Viewport> {
  const { username } = await params;
  const data = await getProfileEmbedData(username);
  return {
    themeColor: data?.themeColor || '#0ea5e9',
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileEmbedData(username);

  if (!data) {
    return {
      title: 'Not Found | GDVN',
      description: 'Player profile not found.',
    };
  }

  const base = getSiteBaseUrl();
  const avatarUrl = data.avatarUrl ? toAbsoluteUrl(data.avatarUrl) : null;
  const themeColor = data.themeColor || '#0ea5e9';

  return {
    metadataBase: new URL(base),
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      type: 'profile',
      url: `${base}/profile/${encodeURIComponent(data.username)}`,
      siteName: 'GDVN',
      locale: 'vi_VN',
      images: avatarUrl ? [{ url: avatarUrl, width: 256, height: 256, alt: data.username }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: data.title,
      description: data.description,
      images: avatarUrl ? [avatarUrl] : undefined,
    },
    other: {
      'theme-color': themeColor,
    },
  };
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
