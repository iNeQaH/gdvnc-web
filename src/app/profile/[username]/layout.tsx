import { Metadata } from 'next';
import { getProfileEmbedData, buildProfileEmbedDescription, getSiteBaseUrl } from '@/lib/profileEmbed';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileEmbedData(username);

  if (!data) {
    return {
      title: 'Not Found | GDVNC',
      description: 'Player profile not found.',
    };
  }

  const title = `${data.username} - GDVNC Player Profile`;
  const desc = buildProfileEmbedDescription(data);
  const base = getSiteBaseUrl();
  const ogImage = `${base}/profile/${encodeURIComponent(data.username)}/opengraph-image`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      url: `${base}/profile/${encodeURIComponent(data.username)}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
