import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVNC Admin',
  'Trang quản trị web GDVNC',
  '/admin'
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
