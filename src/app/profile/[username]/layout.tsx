import { Metadata } from 'next';
import { getProfileEmbedData, buildProfileEmbedDescription, getSiteBaseUrl, toAbsoluteUrl } from '@/lib/profileEmbed';

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
  const avatar = toAbsoluteUrl(data.avatarUrl);

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      url: `${base}/profile/${encodeURIComponent(data.username)}`,
      images: avatar ? [avatar] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
      images: avatar ? [avatar] : [],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
