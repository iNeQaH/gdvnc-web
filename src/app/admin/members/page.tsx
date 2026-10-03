'use client';

import UsersTab from '../components/UsersTab';
import { useAdminContext } from '../AdminClientWrapper';

export default function AdminMembersPage() {
  const { currentUser } = useAdminContext();
  return <UsersTab currentUser={currentUser} />;
}
