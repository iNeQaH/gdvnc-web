'use client';

import LevelsTab from '../components/LevelsTab';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminFunctionsPage() {
  const { currentUser, isSuperAdmin } = useAdminContext();
  if (!isSuperAdmin) return null;
  return <LevelsTab currentUser={currentUser} isSuperAdmin={isSuperAdmin} />;
}
