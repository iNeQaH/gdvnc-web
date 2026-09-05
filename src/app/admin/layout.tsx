import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { pageMetadata } from '@/lib/pageMeta';
import { getSessionUser, isStaffRole } from '@/lib/auth';

export const metadata = pageMetadata(
  'GDVN Admin',
  'Trang quản trị web GDVN',
  '/admin'
);

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) {
    redirect('/login');
  }
  return <>{children}</>;
}
