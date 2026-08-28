import type { Metadata } from 'next';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = `https://gdvnc-web.vercel.app${path}`;

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
