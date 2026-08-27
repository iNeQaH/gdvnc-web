import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'GDVNC Levels',
  'Danh sách các level Classic/Platformer',
  '/levels'
);

export default function LevelsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
