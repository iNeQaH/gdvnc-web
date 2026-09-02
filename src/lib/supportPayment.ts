export const SUPPORT_BANK = {
  name: 'VietinBank',
  code: 'ICB',
  bin: '970415',
  account: '100879164042',
  owner: 'NGUYEN QUANG HIEP',
  appId: 'icb',
} as const;

export const SUPPORT_PRICE_PER_MONTH = 20_000;

export const SUPPORT_PLANS = [1, 3, 6, 12] as const;

export const SUPPORT_BANK_APPS = [
  { id: 'icb', name: 'VietinBank' },
  { id: 'vcb', name: 'Vietcombank' },
  { id: 'mb', name: 'MB Bank' },
  { id: 'tcb', name: 'Techcombank' },
  { id: 'bidv', name: 'BIDV' },
  { id: 'acb', name: 'ACB' },
  { id: 'vpb', name: 'VPBank' },
] as const;

export function sanitizeSupportUsername(username: string) {
  return String(username || '')
    .trim()
    .replace(/[^\w.-]/g, '')
    .slice(0, 24);
}

export function normalizeSupportMonths(months: number) {
  return SUPPORT_PLANS.includes(months as (typeof SUPPORT_PLANS)[number]) ? months : 1;
}

/** Transfer memo banks will show: `username - 3T` */
export function supportTransferContent(username: string, months: number) {
  const user = sanitizeSupportUsername(username) || 'GDVN';
  return `${user} - ${normalizeSupportMonths(months)}T`;
}

export function supportAmount(months: number) {
  return normalizeSupportMonths(months) * SUPPORT_PRICE_PER_MONTH;
}

export function supportQrUrl(content: string, amount: number) {
  const params = new URLSearchParams({
    accountName: SUPPORT_BANK.owner,
    addInfo: content,
    amount: String(amount),
  });
  return `https://img.vietqr.io/image/${SUPPORT_BANK.code}-${SUPPORT_BANK.account}-compact2.png?${params.toString()}`;
}

/** Opens a Vietnamese banking app (mobile). Extra params are kept for future auto-fill. */
export function supportBankAppUrl(appId: string, content: string, amount: number) {
  const app = SUPPORT_BANK_APPS.some((item) => item.id === appId) ? appId : SUPPORT_BANK.appId;
  const params = new URLSearchParams({
    app,
    ba: `${SUPPORT_BANK.account}@${SUPPORT_BANK.code}`,
    am: String(amount),
    tn: content,
    bn: SUPPORT_BANK.owner,
  });
  return `https://dl.vietqr.io/pay?${params.toString()}`;
}

export function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
