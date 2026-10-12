/**
 * Dynamic Custom Theme Generator based on HSL (Hue, Saturation, Lightness/Brightness)
 * Exclusively for Supporters: Derives all page elements (backgrounds, cards, borders, text, accents)
 * from custom color(s) and gradient angle.
 */

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  let cleanHex = hex.replace(/^#/, '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 199, s: 89, l: 48 }; // Default sky-500 fallback (#0ea5e9)
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export const CUSTOM_THEME_KEYS = [
  '--bg-page',
  '--bg-card',
  '--bg-subtle',
  '--border-ui',
  '--border-subtle',
  '--text-title',
  '--text-body',
  '--text-dim',
  '--accent',
  '--accent-hover',
  '--accent-bg',
  '--accent-text',
  '--accent-fg',
  '--accent-gradient',
] as const;

export interface CustomThemeStoredConfig {
  colors: string[];
  angle: number;
}

export function getCustomThemeVars(
  colorsInput: string | string[],
  isDark: boolean,
  angleInput: number = 135
): Record<string, string> {
  const rawList = Array.isArray(colorsInput) ? colorsInput : [colorsInput];
  const cleanColors = rawList
    .map((c) => (c ? c.trim() : ''))
    .filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));

  const colors = cleanColors.length > 0 ? cleanColors : ['#0ea5e9'];
  const angle = ((angleInput % 360) + 360) % 360;
  const hslList = colors.map(hexToHsl);
  const primaryHsl = hslList[0];

  if (isDark) {
    const pageStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 30))}%, 8%)`)
      .join(', ');
    const subtleStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 24))}%, 10%)`)
      .join(', ');
    const accentBgStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 60))}%, 22%)`)
      .join(', ');

    const bgPage =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${pageStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 30))}%, 8%)`;

    const bgSubtle =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${subtleStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 24))}%, 10%)`;

    const accentBg =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${accentBgStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 60))}%, 22%)`;

    const accentGradient =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
        : `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(52, primaryHsl.l)}%)`;

    return {
      '--bg-page': bgPage,
      '--bg-card': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 22))}%, 13%)`,
      '--bg-subtle': bgSubtle,
      '--border-ui': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 25))}%, 24%)`,
      '--border-subtle': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 20))}%, 18%)`,
      '--text-title': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 15))}%, 96%)`,
      '--text-body': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 15))}%, 85%)`,
      '--text-dim': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 15))}%, 62%)`,
      '--accent': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(52, primaryHsl.l)}%)`,
      '--accent-hover': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(42, primaryHsl.l - 8)}%)`,
      '--accent-bg': accentBg,
      '--accent-text': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 40))}%, 92%)`,
      '--accent-fg': '#ffffff',
      '--accent-gradient': accentGradient,
    };
  }

  // Light mode
  const pageStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 25))}%, 96%)`)
    .join(', ');
  const subtleStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 22))}%, 97%)`)
    .join(', ');
  const accentBgStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 45))}%, 93%)`)
    .join(', ');

  const bgPage =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${pageStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 25))}%, 96%)`;

  const bgSubtle =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${subtleStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 22))}%, 97%)`;

  const accentBg =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${accentBgStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 45))}%, 93%)`;

  const accentGradient =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
      : `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${primaryHsl.l}%)`;

  return {
    '--bg-page': bgPage,
    '--bg-card': '#ffffff',
    '--bg-subtle': bgSubtle,
    '--border-ui': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 28))}%, 82%)`,
    '--border-subtle': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 20))}%, 91%)`,
    '--text-title': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 40))}%, 12%)`,
    '--text-body': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 30))}%, 26%)`,
    '--text-dim': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 20))}%, 48%)`,
    '--accent': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${primaryHsl.l}%)`,
    '--accent-hover': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(10, primaryHsl.l - 8)}%)`,
    '--accent-bg': accentBg,
    '--accent-text': `hsl(${primaryHsl.h}, ${Math.round(Math.max(primaryHsl.s, 60))}%, ${Math.min(36, Math.max(20, primaryHsl.l - 15))}%)`,
    '--accent-fg': primaryHsl.l > 65 ? '#000000' : '#ffffff',
    '--accent-gradient': accentGradient,
  };
}

export function applyCustomThemeVars(
  root: HTMLElement,
  config: CustomThemeStoredConfig | string | string[],
  isDark: boolean
): void {
  let colors: string[] = ['#0ea5e9'];
  let angle = 135;
  if (typeof config === 'string') {
    colors = [config];
  } else if (Array.isArray(config)) {
    colors = config;
  } else if (config && typeof config === 'object') {
    colors = config.colors || ['#0ea5e9'];
    angle = typeof config.angle === 'number' ? config.angle : 135;
  }
  const vars = getCustomThemeVars(colors, isDark, angle);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

export function removeCustomThemeVars(root: HTMLElement): void {
  for (const key of CUSTOM_THEME_KEYS) {
    root.style.removeProperty(key);
  }
}

export function getStoredCustomThemeConfig(): CustomThemeStoredConfig {
  if (typeof window === 'undefined') return { colors: ['#0ea5e9'], angle: 135 };
  const override = (window as any).__profileOverride;
  if (override?.customThemeColors && Array.isArray(override.customThemeColors) && override.customThemeColors.length > 0) {
    return {
      colors: override.customThemeColors,
      angle: typeof override.customThemeAngle === 'number' ? override.customThemeAngle : 135,
    };
  }
  if (override?.customThemeColor) {
    return {
      colors: [override.customThemeColor],
      angle: 135,
    };
  }
  try {
    const raw = localStorage.getItem('gdvnc_user');
    if (raw) {
      const u = JSON.parse(raw);
      const cfg = u?.profileConfig;
      if (cfg?.customThemeColors && Array.isArray(cfg.customThemeColors) && cfg.customThemeColors.length > 0) {
        return {
          colors: cfg.customThemeColors,
          angle: typeof cfg.customThemeAngle === 'number' ? cfg.customThemeAngle : 135,
        };
      }
      if (cfg?.customThemeColor) {
        return {
          colors: [cfg.customThemeColor],
          angle: 135,
        };
      }
    }
  } catch {}
  return { colors: ['#0ea5e9'], angle: 135 };
}

export function getStoredCustomThemeColor(): string {
  return getStoredCustomThemeConfig().colors[0] || '#0ea5e9';
}
