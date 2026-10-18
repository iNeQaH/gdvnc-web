import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { getSiteBaseUrl } from '@/lib/profileEmbed';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ann = await prisma.siteAnnouncement.findUnique({
    where: { id },
    select: { title: true, excerpt: true, body: true },
  });

  if (!ann) {
    return {
      title: 'Thông báo không tồn tại | GDVN',
      description: 'Không tìm thấy thông báo này.',
    };
  }

  const title = ann.title;
  const description =
    ann.excerpt?.trim() ||
    ann.body.slice(0, 160).replace(/[#*`_~>\[\]]/g, '').trim() ||
    'Thông báo từ GDVN';
  const base = getSiteBaseUrl();

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${base}/announcements/${encodeURIComponent(id)}`,
      siteName: 'GDVN',
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function AnnouncementDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
