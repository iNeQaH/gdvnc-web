/**
 * Dynamic Custom Theme Generator based on HSL (Hue, Saturation, Lightness/Brightness)
 * Exclusively for Supporters: Derives all page elements (backgrounds, cards, borders, text, accents)
 * from custom color(s), gradient angle, and dedicated border colors.
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
  '--border-glow',
  '--border-glow-shadow',
  '--border-gradient-stops',
  '--border-animation-play-state',
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
  borderColors?: string[];
  borderAnimation?: boolean;
  borderGlowEnabled?: boolean;
  borderGlowColor?: string;
}

export function getCustomThemeVars(
  colorsInput: string | string[],
  isDark: boolean,
  angleInput: number = 135,
  borderColorsInput?: string | string[],
  borderAnimation: boolean = true,
  borderGlowEnabled: boolean = true,
  borderGlowColorInput?: string
): Record<string, string> {
  const rawList = Array.isArray(colorsInput) ? colorsInput : [colorsInput];
  const cleanColors = rawList
    .map((c) => (c ? c.trim() : ''))
    .filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));

  const colors = cleanColors.length > 0 ? cleanColors : ['#0ea5e9'];
  const angle = ((angleInput % 360) + 360) % 360;
  const hslList = colors.map(hexToHsl);
  const primaryHsl = hslList[0];

  // Border colors: if custom border colors provided, use them; otherwise use theme colors
  const rawBorderList = borderColorsInput
    ? Array.isArray(borderColorsInput)
      ? borderColorsInput
      : [borderColorsInput]
    : [];
  const cleanBorderColors = rawBorderList
    .map((c) => (c ? c.trim() : ''))
    .filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));

  const borderColors = cleanBorderColors.length > 0 ? cleanBorderColors : colors;
  const borderHslList = borderColors.map(hexToHsl);
  const primaryBorderHsl = borderHslList[0];

  if (isDark) {
    // DARK MODE: Brightened backgrounds and elements so it is not too dark
    const pageLightness = 16; // Up from 8% to 16% (rich & visible background)
    const pageSat = 42;
    const cardLightness = 22; // Up from 13% to 22% (crisp card contrast)
    const subtleLightness = 18; // Up from 10% to 18%

    const pageStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, pageSat))}%, ${pageLightness}%)`)
      .join(', ');
    const subtleStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 35))}%, ${subtleLightness}%)`)
      .join(', ');
    const accentBgStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 60))}%, 28%)`)
      .join(', ');

    const bgPage =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${pageStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, pageSat))}%, ${pageLightness}%)`;

    const bgSubtle =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${subtleStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 35))}%, ${subtleLightness}%)`;

    const accentBg =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${accentBgStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 60))}%, 28%)`;

    const accentGradient =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
        : `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(56, primaryHsl.l)}%)`;

    // Border in Dark Mode: Thick, luminous, bright and glowing!
    const borderUiColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.max(primaryBorderHsl.s, 75))}%, 68%)`;
    const borderSubtleColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.max(primaryBorderHsl.s, 60))}%, 52%)`;
    const glowHsl =
      borderGlowColorInput && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(borderGlowColorInput.trim())
        ? hexToHsl(borderGlowColorInput)
        : primaryBorderHsl;
    const borderGlow = borderGlowEnabled
      ? `hsla(${glowHsl.h}, ${Math.max(glowHsl.s, 75)}%, 65%, 0.45)`
      : 'transparent';
    const borderGlowShadow = borderGlowEnabled
      ? `0 0 22px 2px ${borderGlow}, 0 0 38px -6px ${borderGlow}`
      : 'none';

    // Conic gradient stops for rotating border:
    const borderStops =
      borderColors.length > 1
        ? `${borderColors.join(', ')}, ${borderColors[0]}`
        : `hsl(${primaryBorderHsl.h}, 85%, 72%), hsl(${primaryBorderHsl.h}, 65%, 48%), hsl(${primaryBorderHsl.h}, 85%, 72%)`;

    return {
      '--bg-page': bgPage,
      '--bg-card': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 30))}%, ${cardLightness}%)`,
      '--bg-subtle': bgSubtle,
      '--border-ui': borderUiColor,
      '--border-subtle': borderSubtleColor,
      '--border-glow': borderGlow,
      '--border-glow-shadow': borderGlowShadow,
      '--border-gradient-stops': borderStops,
      '--border-animation-play-state': borderAnimation ? 'running' : 'paused',
      '--text-title': `hsl(${primaryHsl.h}, 20%, 98%)`,
      '--text-body': `hsl(${primaryHsl.h}, 20%, 90%)`,
      '--text-dim': `hsl(${primaryHsl.h}, 20%, 70%)`,
      '--accent': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(56, primaryHsl.l)}%)`,
      '--accent-hover': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(46, primaryHsl.l - 8)}%)`,
      '--accent-bg': accentBg,
      '--accent-text': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 40))}%, 94%)`,
      '--accent-fg': '#ffffff',
      '--accent-gradient': accentGradient,
    };
  }

  // LIGHT MODE:
  // Background gradient at 90-91% lightness so it is clearly colorful & distinct, NOT washed out white!
  const pageLightness = 91;
  const pageSat = 40;

  const pageStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, pageSat))}%, ${pageLightness}%)`)
    .join(', ');
  const subtleStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 32))}%, 94%)`)
    .join(', ');
  const accentBgStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 45))}%, 93%)`)
    .join(', ');

  const bgPage =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${pageStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, pageSat))}%, ${pageLightness}%)`;

  const bgSubtle =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${subtleStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 32))}%, 94%)`;

  const accentBg =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${accentBgStops})`
      : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 45))}%, 93%)`;

  const accentGradient =
    colors.length > 1
      ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
      : `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${primaryHsl.l}%)`;

  // Border in Light Mode: Darker, bolder contrast against light backgrounds!
  const borderUiColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.max(primaryBorderHsl.s, 70))}%, 26%)`;
  const borderSubtleColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.max(primaryBorderHsl.s, 50))}%, 40%)`;
  const lightGlowHsl =
    borderGlowColorInput && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(borderGlowColorInput.trim())
      ? hexToHsl(borderGlowColorInput)
      : primaryBorderHsl;
  const borderGlow = borderGlowEnabled
    ? `hsla(${lightGlowHsl.h}, ${Math.max(lightGlowHsl.s, 60)}%, 35%, 0.22)`
    : 'transparent';
  const borderGlowShadow = borderGlowEnabled
    ? `0 0 16px 2px ${borderGlow}`
    : 'none';

  const borderStops =
    borderColors.length > 1
      ? `${borderColors.join(', ')}, ${borderColors[0]}`
      : `hsl(${primaryBorderHsl.h}, 75%, 22%), hsl(${primaryBorderHsl.h}, 60%, 42%), hsl(${primaryBorderHsl.h}, 75%, 22%)`;

  return {
    '--bg-page': bgPage,
    '--bg-card': '#ffffff',
    '--bg-subtle': bgSubtle,
    '--border-ui': borderUiColor,
    '--border-subtle': borderSubtleColor,
    '--border-glow': borderGlow,
    '--border-glow-shadow': borderGlowShadow,
    '--border-gradient-stops': borderStops,
    '--border-animation-play-state': borderAnimation ? 'running' : 'paused',
    '--text-title': `hsl(${primaryHsl.h}, 45%, 12%)`,
    '--text-body': `hsl(${primaryHsl.h}, 35%, 24%)`,
    '--text-dim': `hsl(${primaryHsl.h}, 25%, 45%)`,
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
  let borderColors: string[] | undefined = undefined;
  let borderAnimation = true;
  let borderGlowEnabled = true;
  let borderGlowColor: string | undefined = undefined;

  if (typeof config === 'string') {
    colors = [config];
  } else if (Array.isArray(config)) {
    colors = config;
  } else if (config && typeof config === 'object') {
    colors = config.colors || ['#0ea5e9'];
    angle = typeof config.angle === 'number' ? config.angle : 135;
    borderColors =
      Array.isArray(config.borderColors) && config.borderColors.length > 0 ? config.borderColors : undefined;
    borderAnimation = config.borderAnimation !== undefined ? Boolean(config.borderAnimation) : true;
    borderGlowEnabled = config.borderGlowEnabled !== undefined ? Boolean(config.borderGlowEnabled) : true;
    borderGlowColor = config.borderGlowColor || undefined;
  }

  const vars = getCustomThemeVars(
    colors,
    isDark,
    angle,
    borderColors,
    borderAnimation,
    borderGlowEnabled,
    borderGlowColor
  );
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
  if (typeof window === 'undefined') {
    return { colors: ['#0ea5e9'], angle: 135, borderAnimation: true, borderGlowEnabled: true };
  }
  const override = (window as any).__profileOverride;
  if (override?.customThemeColors && Array.isArray(override.customThemeColors) && override.customThemeColors.length > 0) {
    return {
      colors: override.customThemeColors,
      angle: typeof override.customThemeAngle === 'number' ? override.customThemeAngle : 135,
      borderColors: override.customBorderColors,
      borderAnimation: override.customBorderAnimation !== undefined ? Boolean(override.customBorderAnimation) : true,
      borderGlowEnabled: override.customBorderGlowEnabled !== undefined ? Boolean(override.customBorderGlowEnabled) : true,
      borderGlowColor: override.customBorderGlowColor || undefined,
    };
  }
  if (override?.customThemeColor) {
    return {
      colors: [override.customThemeColor],
      angle: 135,
      borderColors: override.customBorderColors,
      borderAnimation: override.customBorderAnimation !== undefined ? Boolean(override.customBorderAnimation) : true,
      borderGlowEnabled: override.customBorderGlowEnabled !== undefined ? Boolean(override.customBorderGlowEnabled) : true,
      borderGlowColor: override.customBorderGlowColor || undefined,
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
          borderColors: cfg.customBorderColors,
          borderAnimation: cfg.customBorderAnimation !== undefined ? Boolean(cfg.customBorderAnimation) : true,
          borderGlowEnabled: cfg.customBorderGlowEnabled !== undefined ? Boolean(cfg.customBorderGlowEnabled) : true,
          borderGlowColor: cfg.customBorderGlowColor || undefined,
        };
      }
      if (cfg?.customThemeColor) {
        return {
          colors: [cfg.customThemeColor],
          angle: 135,
          borderColors: cfg.customBorderColors,
          borderAnimation: cfg.customBorderAnimation !== undefined ? Boolean(cfg.customBorderAnimation) : true,
          borderGlowEnabled: cfg.customBorderGlowEnabled !== undefined ? Boolean(cfg.customBorderGlowEnabled) : true,
          borderGlowColor: cfg.customBorderGlowColor || undefined,
        };
      }
    }
  } catch {}
  return { colors: ['#0ea5e9'], angle: 135, borderAnimation: true, borderGlowEnabled: true };
}

export function getStoredCustomThemeColor(): string {
  return getStoredCustomThemeConfig().colors[0] || '#0ea5e9';
}
