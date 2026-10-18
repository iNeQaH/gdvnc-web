import type { Metadata } from 'next';

export function getPublicSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith('http')) {
    return env.replace(/\/$/, '');
  }
  return 'https://geodat.vn';
}

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  options?: {
    image?: string | null;
    card?: 'summary' | 'summary_large_image';
    themeColor?: string | null;
    type?: 'website' | 'article' | 'profile';
  }
): Metadata {
  const base = getPublicSiteUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${cleanPath}`;

  const image = options?.image
    ? options.image.startsWith('http')
      ? options.image
      : `${base}${options.image.startsWith('/') ? options.image : `/${options.image}`}`
    : undefined;

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: options?.type || 'website',
      url,
      siteName: 'GDVN',
      locale: 'vi_VN',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: options?.card || 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
    ...(options?.themeColor
      ? {
          other: {
            'theme-color': options.themeColor,
          },
        }
      : {}),
  };
}
