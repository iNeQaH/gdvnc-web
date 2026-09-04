export const SUPER_ADMIN_USERNAME = 'iNeQaH';

export function isSuperAdminUsername(username?: string | null) {
  return (username || '').trim() === SUPER_ADMIN_USERNAME;
}

export function isStaffRole(role?: string | null) {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export function isFullAdminRole(role?: string | null) {
  return role === 'ADMIN';
}
