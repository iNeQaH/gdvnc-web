import { Metadata } from 'next';
import { getProfileEmbedData, buildProfileEmbedDescription, getSiteBaseUrl, profileEmbedImageUrl } from '@/lib/profileEmbed';

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
  const avatar = profileEmbedImageUrl(data.avatarUrl, data.username);
  const images = avatar
    ? [{ url: avatar, width: 512, height: 512, alt: data.username }]
    : [];

  return {
    metadataBase: new URL(base),
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      url: `${base}/profile/${encodeURIComponent(data.username)}`,
      images,
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
