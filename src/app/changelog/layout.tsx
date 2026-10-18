import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Nhật kí thay đổi',
  'Thay đổi xếp hạng trong danh sách',
  '/changelog'
);

export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
