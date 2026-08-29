import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVN Hall of Fame',
  'Hall of Fame — lịch sử cộng đồng Geometry Dash Việt Nam.',
  '/timeline'
);

export default function TimelineLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
