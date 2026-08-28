import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Support',
  'Ủng hộ tuiiii :3',
  '/support'
);

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
