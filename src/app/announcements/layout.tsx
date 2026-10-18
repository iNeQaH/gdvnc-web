import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Thông báo',
  'Các thông báo của web',
  '/announcements'
);

export default function AnnouncementsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
