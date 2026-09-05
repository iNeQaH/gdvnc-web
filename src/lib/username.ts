const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const MIN_LEN = 3;
const MAX_LEN = 24;

const STATIC_RESERVED = [
  'admin',
  'administrator',
  'moderator',
  'mod',
  'gdvn',
  'gdvnc',
  'root',
  'system',
  'support',
  'api',
  'www',
  'static',
  'login',
  'register',
  'timeline',
  'ineqah',
];

export function reservedUsernames(): Set<string> {
  const extra = (process.env.SUPER_ADMIN_USERNAMES || process.env.SUPER_ADMIN_USERNAME || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...STATIC_RESERVED, ...extra, 'ineqah']);
}

export function validateUsername(raw: unknown): { ok: true; value: string } | { ok: false; errorEn: string; errorVi: string } {
  const value = String(raw ?? '').trim();
  if (value.length < MIN_LEN || value.length > MAX_LEN) {
    return {
      ok: false,
      errorEn: `Username must be ${MIN_LEN}–${MAX_LEN} characters.`,
      errorVi: `Tên người dùng phải từ ${MIN_LEN} đến ${MAX_LEN} ký tự.`,
    };
  }
  if (!USERNAME_RE.test(value)) {
    return {
      ok: false,
      errorEn: 'Username may only contain letters, numbers, underscore, and hyphen.',
      errorVi: 'Tên người dùng chỉ được chứa chữ, số, gạch dưới và gạch ngang.',
    };
  }
  if (reservedUsernames().has(value.toLowerCase())) {
    return {
      ok: false,
      errorEn: 'This username is reserved.',
      errorVi: 'Tên người dùng này đã được dành riêng.',
    };
  }
  return { ok: true, value };
}
