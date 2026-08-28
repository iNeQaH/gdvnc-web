import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Submission',
  'Nộp bằng chứng, gửi level của bạn tại đây',
  '/submit'
);

export default function SubmitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
