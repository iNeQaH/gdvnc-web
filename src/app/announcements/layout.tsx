import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Thông báo',
  'Thông báo chính thức của cộng đồng Geometry Dash Việt Nam.',
  '/announcements'
);

export default function AnnouncementsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
