import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Nộp',
  'Gửi record của bạn! Nhớ đọc luật trước khi gửi nha.',
  '/submit'
);

export default function SubmitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
