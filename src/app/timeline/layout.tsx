import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN THE CHRONICLES',
  'THE CHRONICLES — lịch sử cộng đồng Geometry Dash Việt Nam.',
  '/timeline'
);

export default function TimelineLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
