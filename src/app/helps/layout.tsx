import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Helps',
  'Yêu cầu hỗ trợ, đề xuất, báo lỗi,...',
  '/helps'
);

export default function HelpsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
