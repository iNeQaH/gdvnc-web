'use client';

import LevelDataGrid from '../components/LevelDataGrid';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminLevelGridPage() {
  const { currentUser } = useAdminContext();
  return <LevelDataGrid currentUser={currentUser} />;
}
