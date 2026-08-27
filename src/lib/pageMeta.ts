import type { Metadata } from 'next';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = `https://gdvnc-web.vercel.app${path}`;
  const image = `/api/og/site?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: 'GDVNC',
      locale: 'vi_VN',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
