'use client';

import HelpsTab from '../components/HelpsTab';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminHelpsPage() {
  const { setHelpsTotal } = useAdminContext();
  return <HelpsTab onTotalChange={setHelpsTotal} />;
}
