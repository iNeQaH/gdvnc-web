import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Hỗ trợ',
  'Gửi thắc mắc, gợi ý, yêu cầu về web tại đây',
  '/helps'
);

export default function HelpsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
