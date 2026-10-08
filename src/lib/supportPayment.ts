export const SUPPORT_BANK = {
  name: 'VietinBank',
  code: 'ICB',
  bin: '970415',
  account: '100879164042',
  owner: 'NGUYEN QUANG HIEP',
  appId: 'icb',
} as const;

export function sanitizeSupportUsername(username: string) {
  return String(username || '')
    .trim()
    .replace(/[^\w.-]/g, '')
    .slice(0, 24)
    .toUpperCase();
}

export function supportTransferContent(username: string) {
  const sanitized = sanitizeSupportUsername(username);
  return sanitized ? `GDVN ${sanitized}` : 'GDVN';
}

/** Account QR with memo baked in */
export function supportQrUrl(username?: string) {
  const base = `https://img.vietqr.io/image/${SUPPORT_BANK.code}-${SUPPORT_BANK.account}-compact2.png`;
  if (!username) return base;
  
  const content = supportTransferContent(username);
  return `${base}?addInfo=${encodeURIComponent(content)}`;
}
