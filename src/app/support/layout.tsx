import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVNC Support',
  'Ủng hộ tuiiii :3'
);

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
