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

export function calculateSupportPrice(months: number) {
  const basePrice = 20000;
  let discountPercent = Math.floor(months / 3) * 5;
  if (discountPercent > 60) discountPercent = 60;
  
  const totalPrice = (basePrice * months) * (1 - discountPercent / 100);
  return {
    originalPrice: basePrice * months,
    discountPercent,
    totalPrice
  };
}

export function supportTransferContent(username: string, months: number = 1) {
  const sanitized = sanitizeSupportUsername(username);
  return sanitized ? `${sanitized} SUPPORT ${months}T` : 'SUPPORT';
}

export function supportQrUrl(username: string, months: number = 1) {
  const base = `https://img.vietqr.io/image/${SUPPORT_BANK.code}-${SUPPORT_BANK.account}-compact2.png`;
  if (!username) return base;
  
  const content = supportTransferContent(username, months);
  const { totalPrice } = calculateSupportPrice(months);
  
  return `${base}?amount=${totalPrice}&addInfo=${encodeURIComponent(content)}`;
}

