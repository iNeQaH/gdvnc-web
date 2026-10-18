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
  const bonusSp = Math.floor(months / 3) * 2;
  const baseSp = months;
  const totalSp = baseSp + bonusSp;

  return {
    originalPrice: basePrice * months,
    discountPercent,
    totalPrice,
    bonusSp,
    baseSp,
    totalSp,
  };
}

export function detectMonthsFromAmount(amount: number): number {
  if (amount <= 0) return 0;
  // Check exact/close matches from 36 down to 1
  for (let m = 36; m >= 1; m--) {
    const { totalPrice } = calculateSupportPrice(m);
    // Allow up to 3,000 VND variance for rounding or slight differences
    if (Math.abs(amount - totalPrice) <= 3000) {
      return m;
    }
  }
  // Fallback: standard 20k per month
  return Math.floor(amount / 20000);
}

export function supportTransferContent(username: string, months: number = 1) {
  const sanitized = sanitizeSupportUsername(username);
  return sanitized ? `SEVQR GDVN ${sanitized} SUPPORT ${months}T` : 'SEVQR GDVN SUPPORT';
}

export function supportQrUrl(username: string, months: number = 1) {
  const base = `https://img.vietqr.io/image/${SUPPORT_BANK.code}-${SUPPORT_BANK.account}-compact2.png`;
  if (!username) return base;
  
  const content = supportTransferContent(username, months);
  const { totalPrice } = calculateSupportPrice(months);
  
  return `${base}?amount=${totalPrice}&addInfo=${encodeURIComponent(content)}`;
}

