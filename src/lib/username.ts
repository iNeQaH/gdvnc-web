export const USERNAME_RE = /^[a-zA-Z0-9]+$/;
export const MIN_LEN = 3;
export const MAX_LEN = 24;

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

import { validateUsernameContent } from './contentFilter';

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
      errorEn: 'Username may only contain English letters (a-z, A-Z) and numbers (0-9) with no special characters or spaces.',
      errorVi: 'Tên người dùng chỉ được chứa chữ cái tiếng Anh (không dấu) và số (0-9), không chứa ký tự đặc biệt hay khoảng trắng.',
    };
  }
  if (reservedUsernames().has(value.toLowerCase())) {
    return {
      ok: false,
      errorEn: 'This username is reserved.',
      errorVi: 'Tên người dùng này đã được dành riêng.',
    };
  }
  const contentCheck = validateUsernameContent(value);
  if (!contentCheck.ok) {
    return {
      ok: false,
      errorEn: contentCheck.errorEn || 'Username contains sensitive or prohibited words.',
      errorVi: contentCheck.errorVi || 'Tên người dùng chứa từ ngữ nhạy cảm hoặc bị cấm.',
    };
  }
  return { ok: true, value };
}

/**
 * Chuẩn hóa một username bất kỳ thành username hợp lệ:
 * - Bỏ dấu tiếng Việt
 * - Bỏ tất cả ký tự không phải chữ cái và số
 * - Nếu < 3 ký tự thì fallback sang fallbackSeed (nếu hợp lệ) hoặc đệm thêm tiền tố User/hậu tố số
 * - Giới hạn độ dài từ 3 đến 24 ký tự
 */
export function sanitizeToLegalUsername(raw: string, fallbackSeed?: string): string {
  const stripDiacritics = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');

  let s = stripDiacritics(raw).replace(/[^a-zA-Z0-9]/g, '');

  if (s.length < MIN_LEN && fallbackSeed) {
    const fb = stripDiacritics(fallbackSeed).replace(/[^a-zA-Z0-9]/g, '');
    if (fb.length >= MIN_LEN) {
      s = fb;
    }
  }

  if (s.length < MIN_LEN) {
    s = `User${s}`.slice(0, MAX_LEN);
    if (s.length < MIN_LEN) {
      s = `${s}123`.slice(0, MAX_LEN);
    }
  }

  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN);
  }

  return s;
}
