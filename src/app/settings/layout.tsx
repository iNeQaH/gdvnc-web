import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Cài đặt cá nhân',
  'Vào đây sửa thông tin với làm đẹp nha',
  '/settings'
);

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
