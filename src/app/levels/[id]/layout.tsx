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
    },
    twitter: {
      card: 'summary',
      title: embed.title,
      description: embed.description,
    },
  };
}

export default function LevelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
