'use client';

import RecordsTab from '../components/RecordsTab';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminRecordsPage() {
  const { currentUser, setRecordCount } = useAdminContext();
  return <RecordsTab currentUser={currentUser} onPendingCountChange={setRecordCount} />;
}
