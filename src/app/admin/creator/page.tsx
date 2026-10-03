'use client';

import WorksTab from '../components/WorksTab';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminCreatorPage() {
  const { currentUser, setWorkCount } = useAdminContext();
  return <WorksTab currentUser={currentUser} onPendingCountChange={setWorkCount} />;
}
