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
    .slice(0, 24);
}

export function supportTransferContent(username: string) {
  return sanitizeSupportUsername(username);
}

/** Account QR only — no amount or memo baked in. */
export function supportQrUrl() {
  return `https://img.vietqr.io/image/${SUPPORT_BANK.code}-${SUPPORT_BANK.account}-compact2.png`;
}
