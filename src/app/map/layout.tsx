import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Bản đồ',
  'Bản đồ các tỉnh thành và người chơi trong khu vực.',
  '/map'
);

export default function MapLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
