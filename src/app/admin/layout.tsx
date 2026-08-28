import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Admin',
  'Trang quản trị web GDVN',
  '/admin'
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
