import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/pageMeta';

export const metadata = pageMetadata(
  'Luật & Quy định',
  'Một vài điều lưu ý khi sử dụng web',
  '/guidelines'
);

export default function GuidelinesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
