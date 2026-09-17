import { Metadata } from 'next';
import type { ReactNode } from 'react';
import { resolvePublicLevel } from '@/lib/levelLookup';
import { getLevelEmbedData } from '@/lib/levelEmbed';
import { getSiteBaseUrl } from '@/lib/profileEmbed';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const level = await resolvePublicLevel(id);
  const embed = await getLevelEmbedData(level);
  const base = getSiteBaseUrl();

  return {
    metadataBase: new URL(base),
    title: `${embed.title} | GDVN`,
    description: embed.description,
    openGraph: {
      title: embed.title,
      description: embed.description,
      type: 'website',
      url: embed.url,
      siteName: 'GDVN',
      images: [{ url: embed.image, width: 1200, height: 630, alt: embed.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: embed.title,
      description: embed.description,
      images: [embed.image],
    },
  };
}

export default function LevelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
