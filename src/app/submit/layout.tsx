import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVNC Submission',
  'Nộp bằng chứng, gửi level của bạn tại đây'
);

export default function SubmitLayout({ children }: { children: ReactNode }) {
  return children;
}
