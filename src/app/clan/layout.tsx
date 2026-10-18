import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Clans',
  'Các clan trong GDVN',
  '/clan'
);

export default function ClanLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
