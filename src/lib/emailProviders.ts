const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.com.au',
  'outlook.jp',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.vn',
  'yahoo.co.uk',
  'yahoo.co.jp',
  'ymail.com',
  'rocketmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'aol.com',
  'yandex.com',
  'yandex.ru',
  'fastmail.com',
  'fastmail.fm',
  'tuta.com',
  'tutanota.com',
  'mailbox.org',
]);

function extraTrustedDomains(): string[] {
  return (process.env.EMAIL_DOMAIN_WHITELIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(raw: unknown): string | null {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain || local.length > 64) return null;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return null;
  return email;
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : '';
}

export function isTrustedEmailProvider(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (TRUSTED_EMAIL_DOMAINS.has(domain)) return true;
  return extraTrustedDomains().includes(domain);
}

export function untrustedEmailMessage(locale: 'en' | 'vi'): string {
  return locale === 'en'
    ? 'Please use a well-known email provider (Gmail, Outlook, Yahoo, iCloud, Proton Mail, …). Temporary or unknown domains are not allowed.'
    : 'Vui lòng dùng nhà cung cấp email uy tín (Gmail, Outlook, Yahoo, iCloud, Proton Mail, …). Không chấp nhận email tạm hoặc tên miền lạ.';
}
