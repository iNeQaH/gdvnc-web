export interface ThemeInfo {
  id: string;
  name: string;
  nameVi: string;
  isSpecial?: boolean;
  unlockCondition?: string;
  unlockConditionVi?: string;
}

export const THEMES: ThemeInfo[] = [
  { id: 'sky', name: 'Sky', nameVi: 'Bầu trời' },
  { id: 'sakura', name: 'Sakura', nameVi: 'Hoa anh đào' },
  { id: 'mono', name: 'Mono', nameVi: 'Đơn sắc' },
  {
    id: 'mint',
    name: 'RGB',
    nameVi: 'RGB',
    isSpecial: true,
    unlockCondition: 'Requires active Supporter subscription',
    unlockConditionVi: 'Yêu cầu gói Supporter đang hoạt động',
  },
  {
    id: 'custom',
    name: 'Custom Gradient',
    nameVi: 'Tuỳ chỉnh Gradient',
    isSpecial: true,
    unlockCondition: 'Requires active Supporter subscription',
    unlockConditionVi: 'Yêu cầu gói Supporter đang hoạt động',
  },
  {
    id: 'lavender',
    name: 'iNeQaH',
    nameVi: 'iNeQaH',
    isSpecial: true,
    unlockCondition: 'Requires active Supporter or Admin',
    unlockConditionVi: 'Yêu cầu gói Supporter hoặc Quản trị viên',
  },
  {
    id: 'glitch',
    name: '???',
    nameVi: '???',
    isSpecial: true,
    unlockCondition: 'Discovered Easter Egg',
    unlockConditionVi: 'Đã giải mã Easter Egg bí ẩn',
  },
];

export function isThemeUnlocked(themeId: string, user: any): boolean {
  if (!themeId || ['sky', 'sakura', 'mono', 'peach'].includes(themeId)) {
    return true;
  }

  const isSupporter = Boolean(user?.supporterUntil && new Date(user.supporterUntil) > new Date());
  const isAdmin = user?.role === 'ADMIN' || (user?.username && user.username.toLowerCase() === 'ineqah');

  if (['lavender', 'mint', 'custom'].includes(themeId)) {
    return isSupporter || isAdmin;
  }

  if (themeId === 'glitch') {
    return Boolean(
      user?.hasGlitchTheme ||
      user?.easterEggCompleted ||
      user?.easterEggCode ||
      (user?.easterEggPoints ?? 0) >= 100
    );
  }

  return true;
}
