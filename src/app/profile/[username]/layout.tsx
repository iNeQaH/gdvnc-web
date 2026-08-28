import { Metadata } from 'next';
import { getProfileEmbedData, buildProfileEmbedDescription, getSiteBaseUrl } from '@/lib/profileEmbed';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileEmbedData(username);

  if (!data) {
    return {
      title: 'Not Found | GDVN',
      description: 'Player profile not found.',
    };
  }

  const title = `${data.username} - GDVN Player Profile`;
  const desc = buildProfileEmbedDescription(data);
  const base = getSiteBaseUrl();

  return {
    metadataBase: new URL(base),
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      url: `${base}/profile/${encodeURIComponent(data.username)}`,
      siteName: 'GDVN',
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
