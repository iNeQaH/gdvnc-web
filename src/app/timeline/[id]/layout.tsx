import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getTimelineShareMeta } from '@/lib/timeline/embed';
import { getSiteBaseUrl } from '@/lib/profileEmbed';
import { pageMetadata } from '@/lib/pageMeta';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const meta = await getTimelineShareMeta(id);
    if (meta) {
      return {
        metadataBase: new URL(getSiteBaseUrl()),
        title: meta.title,
        description: meta.description,
        alternates: { canonical: meta.url },
        openGraph: {
          title: meta.title,
          description: meta.description,
          type: 'article',
          url: meta.url,
          siteName: 'GDVN',
          locale: 'vi_VN',
          images: [{ url: meta.ogImage, width: 1200, height: 630, alt: meta.title }],
        },
        twitter: {
          card: 'summary_large_image',
          title: meta.title,
          description: meta.description,
          images: [meta.ogImage],
        },
      };
    }
  } catch {
    /* fall through */
  }
  return pageMetadata(
    'GDVN THE CHRONICLES',
    'THE CHRONICLES — lịch sử cộng đồng Geometry Dash Việt Nam.',
    `/timeline/${encodeURIComponent(id)}`
  );
}

export default function TimelineEventLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
