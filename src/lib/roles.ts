const DEFAULT_SUPER_ADMIN = 'iNeQaH';

export function superAdminUsernames(): string[] {
  const fromEnv = process.env.SUPER_ADMIN_USERNAMES || process.env.SUPER_ADMIN_USERNAME || DEFAULT_SUPER_ADMIN;
  const names = fromEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return names.length ? names : [DEFAULT_SUPER_ADMIN];
}

export function superAdminUserIds(): string[] {
  return (process.env.SUPER_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const SUPER_ADMIN_USERNAME = superAdminUsernames()[0] || DEFAULT_SUPER_ADMIN;

export function isSuperAdminUsername(username?: string | null) {
  const name = (username || '').trim();
  if (!name) return false;
  const lower = name.toLowerCase();
  return superAdminUsernames().some((s) => s.toLowerCase() === lower);
}

export function isSuperAdminUser(
  user?: { id?: string | null; userId?: string | null; username?: string | null; role?: string | null } | null
) {
  if (!user) return false;
  if (!isFullAdminRole(user.role)) return false;

  const id = user.id || user.userId;
  const configuredIds = superAdminUserIds();
  if (configuredIds.length > 0) {
    return Boolean(id && configuredIds.includes(id));
  }
  return isSuperAdminUsername(user.username);
}

export function isStaffRole(role?: string | null) {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export function isFullAdminRole(role?: string | null) {
  return role === 'ADMIN';
}
