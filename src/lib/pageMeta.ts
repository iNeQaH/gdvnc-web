import type { Metadata } from 'next';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8088';
  const url = `${base}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
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
