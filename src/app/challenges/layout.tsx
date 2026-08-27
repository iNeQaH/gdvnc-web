import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVNC Challenge List',
  'Danh sách các challenge'
);

export default function ChallengesLayout({ children }: { children: ReactNode }) {
  return children;
}
