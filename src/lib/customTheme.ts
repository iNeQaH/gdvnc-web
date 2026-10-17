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
  '--border-glow-gradient',
  '--border-gradient-stops',
  '--border-animation-play-state',
  '--glow-ox',
  '--glow-oy',
  '--glow-c1',
  '--glow-c2',
  '--glow-blur',
  '--border-angle',
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
  syncGlowWithBorder?: boolean;
  borderGlowColor?: string;
  borderGlowColors?: string[];
  borderGlowAngle?: number;
  borderGlowOpacity?: number;
}

export function getCustomThemeVars(
  colorsInput: string | string[],
  isDark: boolean,
  angleInput: number = 135,
  borderColorsInput?: string | string[],
  borderAnimation: boolean = true,
  borderGlowEnabled: boolean = true,
  borderGlowColorInput?: string | string[],
  borderGlowAngleInput: number = 135,
  borderGlowOpacityInput: number = 70,
  syncGlowWithBorderInput: boolean = false
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
    // DARK MODE: Deep, elegant dark canvas with crisp contrast and refined borders
    const pageLightness = 8;
    const pageSat = 28;
    const cardLightness = 13;
    const subtleLightness = 10;

    const pageStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, pageSat))}%, ${pageLightness}%)`)
      .join(', ');
    const subtleStops = hslList
      .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 24))}%, ${subtleLightness}%)`)
      .join(', ');
    const accentBgStops = hslList
      .map(({ h, s }) => `hsla(${h}, ${Math.round(Math.min(s, 60))}%, 28%, 0.45)`)
      .join(', ');

    const bgPage =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${pageStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, pageSat))}%, ${pageLightness}%)`;

    const bgSubtle =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${subtleStops})`
        : `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 24))}%, ${subtleLightness}%)`;

    const accentBg =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${accentBgStops})`
        : `hsla(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 60))}%, 28%, 0.45)`;

    const accentGradient =
      colors.length > 1
        ? `linear-gradient(${angle}deg, ${colors.join(', ')})`
        : `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(54, primaryHsl.l)}%)`;

    // Border in Dark Mode: Refined, tasteful contrast with subtle accent tint
    const borderUiColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.min(primaryBorderHsl.s, 42))}%, 26%)`;
    const borderSubtleColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.min(primaryBorderHsl.s, 32))}%, 18%)`;

    // Glow calculation (Supports Single Color OR Multi-color Gradient Glow, Sync with Border, and Opacity!)
    const syncGlowWithBorder = Boolean(syncGlowWithBorderInput);
    const borderGlowOpacity = typeof borderGlowOpacityInput === 'number'
      ? Math.max(10, Math.min(100, borderGlowOpacityInput))
      : 70;
    const glowOpRatio = borderGlowOpacity / 100;

    let glowColors: string[];
    let glowAngle: number;

    if (syncGlowWithBorder) {
      glowColors = borderColors;
      glowAngle = angle;
    } else {
      const rawGlowList = borderGlowColorInput
        ? Array.isArray(borderGlowColorInput)
          ? borderGlowColorInput
          : [borderGlowColorInput]
        : [];
      const cleanGlowColors = rawGlowList
        .map((c) => (c ? c.trim() : ''))
        .filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));

      glowColors =
        cleanGlowColors.length > 0
          ? cleanGlowColors
          : borderColors.length > 0
          ? borderColors
          : colors;
      glowAngle = ((borderGlowAngleInput % 360) + 360) % 360;
    }

    let borderGlow = 'transparent';
    let borderGlowShadow = 'none';
    let glowOx = '0px';
    let glowOy = '0px';
    let glowC1 = 'transparent';
    let glowC2 = 'transparent';
    const blurPx = Math.round(16 + glowOpRatio * 10);

    if (borderGlowEnabled && glowColors.length > 0) {
      const isMultiGlow = glowColors.length >= 2;
      const gHsl1 = hexToHsl(glowColors[0]);
      const gHsl2 = hexToHsl(isMultiGlow ? glowColors[1] : glowColors[0]);

      const alpha1 = +(Math.max(0.08, Math.min(0.85, 0.55 * glowOpRatio))).toFixed(2);
      const alpha2 = +(Math.max(0.08, Math.min(0.85, 0.55 * glowOpRatio))).toFixed(2);
      const alphaAmb = +(Math.max(0.05, Math.min(0.70, 0.38 * glowOpRatio))).toFixed(2);

      glowC1 = `hsla(${gHsl1.h}, ${Math.max(gHsl1.s, 75)}%, 65%, ${alpha1})`;
      glowC2 = isMultiGlow ? `hsla(${gHsl2.h}, ${Math.max(gHsl2.s, 75)}%, 65%, ${alpha2})` : glowC1;
      const colAmb = `hsla(${gHsl1.h}, ${Math.max(gHsl1.s, 75)}%, 65%, ${alphaAmb})`;

      borderGlow = glowC1;

      const glowRad = (glowAngle * Math.PI) / 180;
      const oxNum = Math.round(Math.sin(glowRad) * 8);
      const oyNum = Math.round(-Math.cos(glowRad) * 8);
      glowOx = `${oxNum}px`;
      glowOy = `${oyNum}px`;

      if (isMultiGlow) {
        borderGlowShadow = `var(--glow-ox, ${glowOx}) var(--glow-oy, ${glowOy}) ${blurPx}px 1px ${glowC2}, calc(var(--glow-ox, ${glowOx}) * -1) calc(var(--glow-oy, ${glowOy}) * -1) ${blurPx}px 1px ${glowC1}, 0 0 ${Math.round(blurPx * 0.7)}px 2px ${colAmb}`;
      } else {
        borderGlowShadow = `var(--glow-ox, ${glowOx}) var(--glow-oy, ${glowOy}) ${blurPx}px 2px ${glowC1}, 0 0 ${Math.round(blurPx * 0.75)}px 2px ${colAmb}`;
      }
    }

    // Conic gradient stops for rotating border:
    const borderStops =
      borderColors.length > 1
        ? `${borderColors.join(', ')}, ${borderColors[0]}`
        : `hsl(${primaryBorderHsl.h}, 85%, 72%), hsl(${primaryBorderHsl.h}, 65%, 48%), hsl(${primaryBorderHsl.h}, 85%, 72%)`;

    return {
      '--bg-page': bgPage,
      '--bg-card': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 22))}%, ${cardLightness}%)`,
      '--bg-subtle': bgSubtle,
      '--border-ui': borderUiColor,
      '--border-subtle': borderSubtleColor,
      '--border-glow': borderGlow,
      '--border-glow-shadow': borderGlowShadow,
      '--border-glow-gradient': `linear-gradient(${glowAngle}deg, ${glowColors.join(', ')})`,
      '--border-gradient-stops': borderStops,
      '--border-animation-play-state': borderAnimation ? 'running' : 'paused',
      '--glow-ox': glowOx,
      '--glow-oy': glowOy,
      '--glow-c1': glowC1,
      '--glow-c2': glowC2,
      '--glow-blur': `${blurPx}px`,
      '--text-title': `hsl(${primaryHsl.h}, 15%, 98%)`,
      '--text-body': `hsl(${primaryHsl.h}, 12%, 86%)`,
      '--text-dim': `hsl(${primaryHsl.h}, 10%, 65%)`,
      '--accent': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(54, primaryHsl.l)}%)`,
      '--accent-hover': `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${Math.max(46, primaryHsl.l - 8)}%)`,
      '--accent-bg': accentBg,
      '--accent-text': `hsl(${primaryHsl.h}, ${Math.round(Math.min(primaryHsl.s, 40))}%, 94%)`,
      '--accent-fg': '#ffffff',
      '--accent-gradient': accentGradient,
    };
  }

  // LIGHT MODE:
  // Background gradient at 87% lightness so it is clearly colorful & distinct, NOT washed out white!
  const pageLightness = 87;
  const pageSat = 45;

  const pageStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, pageSat))}%, ${pageLightness}%)`)
    .join(', ');
  const subtleStops = hslList
    .map(({ h, s }) => `hsl(${h}, ${Math.round(Math.min(s, 32))}%, 94%)`)
    .join(', ');
  const accentBgStops = hslList
    .map(({ h, s }) => `hsla(${h}, ${Math.round(Math.min(s, 45))}%, 93%)`)
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

  // Border in Light Mode: Clean subtle UI borders
  const borderUiColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.min(primaryBorderHsl.s, 35))}%, 78%)`;
  const borderSubtleColor = `hsl(${primaryBorderHsl.h}, ${Math.round(Math.min(primaryBorderHsl.s, 25))}%, 86%)`;

  const syncGlowWithBorder = Boolean(syncGlowWithBorderInput);
  const borderGlowOpacity = typeof borderGlowOpacityInput === 'number'
    ? Math.max(10, Math.min(100, borderGlowOpacityInput))
    : 70;
  const glowOpRatio = borderGlowOpacity / 100;

  let lightGlowColors: string[];
  let lightGlowAngle: number;

  if (syncGlowWithBorder) {
    lightGlowColors = borderColors;
    lightGlowAngle = angle;
  } else {
    const rawLightGlowList = borderGlowColorInput
      ? Array.isArray(borderGlowColorInput)
        ? borderGlowColorInput
        : [borderGlowColorInput]
      : [];
    const cleanLightGlowColors = rawLightGlowList
      .map((c) => (c ? c.trim() : ''))
      .filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));

    lightGlowColors =
      cleanLightGlowColors.length > 0
        ? cleanLightGlowColors
        : borderColors.length > 0
        ? borderColors
        : colors;
    lightGlowAngle = ((borderGlowAngleInput % 360) + 360) % 360;
  }

  let lightBorderGlow = 'transparent';
  let lightBorderGlowShadow = 'none';
  let lightGlowOx = '0px';
  let lightGlowOy = '0px';
  let lightGlowC1 = 'transparent';
  let lightGlowC2 = 'transparent';
  const lightBlurPx = Math.round(14 + glowOpRatio * 8);

  if (borderGlowEnabled && lightGlowColors.length > 0) {
    const isMultiGlow = lightGlowColors.length >= 2;
    const gHsl1 = hexToHsl(lightGlowColors[0]);
    const gHsl2 = hexToHsl(isMultiGlow ? lightGlowColors[1] : lightGlowColors[0]);

    const alpha1 = +(Math.max(0.06, Math.min(0.65, 0.40 * glowOpRatio))).toFixed(2);
    const alpha2 = +(Math.max(0.06, Math.min(0.65, 0.40 * glowOpRatio))).toFixed(2);
    const alphaAmb = +(Math.max(0.04, Math.min(0.50, 0.28 * glowOpRatio))).toFixed(2);

    lightGlowC1 = `hsla(${gHsl1.h}, ${Math.max(gHsl1.s, 60)}%, 48%, ${alpha1})`;
    lightGlowC2 = isMultiGlow ? `hsla(${gHsl2.h}, ${Math.max(gHsl2.s, 60)}%, 48%, ${alpha2})` : lightGlowC1;
    const colAmb = `hsla(${gHsl1.h}, ${Math.max(gHsl1.s, 60)}%, 48%, ${alphaAmb})`;

    lightBorderGlow = lightGlowC1;

    const glowRad = (lightGlowAngle * Math.PI) / 180;
    const oxNum = Math.round(Math.sin(glowRad) * 6);
    const oyNum = Math.round(-Math.cos(glowRad) * 6);
    lightGlowOx = `${oxNum}px`;
    lightGlowOy = `${oyNum}px`;

    if (isMultiGlow) {
      lightBorderGlowShadow = `var(--glow-ox, ${lightGlowOx}) var(--glow-oy, ${lightGlowOy}) ${lightBlurPx}px 1px ${lightGlowC2}, calc(var(--glow-ox, ${lightGlowOx}) * -1) calc(var(--glow-oy, ${lightGlowOy}) * -1) ${lightBlurPx}px 1px ${lightGlowC1}, 0 0 ${Math.round(lightBlurPx * 0.7)}px 2px ${colAmb}`;
    } else {
      lightBorderGlowShadow = `var(--glow-ox, ${lightGlowOx}) var(--glow-oy, ${lightGlowOy}) ${lightBlurPx}px 2px ${lightGlowC1}, 0 0 ${Math.round(lightBlurPx * 0.75)}px 2px ${colAmb}`;
    }
  }

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
    '--border-glow': lightBorderGlow,
    '--border-glow-shadow': lightBorderGlowShadow,
    '--border-glow-gradient': `linear-gradient(${lightGlowAngle}deg, ${lightGlowColors.join(', ')})`,
    '--border-gradient-stops': borderStops,
    '--border-animation-play-state': borderAnimation ? 'running' : 'paused',
    '--glow-ox': lightGlowOx,
    '--glow-oy': lightGlowOy,
    '--glow-c1': lightGlowC1,
    '--glow-c2': lightGlowC2,
    '--glow-blur': `${lightBlurPx}px`,
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
  let syncGlowWithBorder = false;
  let borderGlowColor: string | undefined = undefined;
  let borderGlowColors: string[] | undefined = undefined;
  let borderGlowAngle = 135;
  let borderGlowOpacity = 70;

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
    syncGlowWithBorder = Boolean(config.syncGlowWithBorder);
    borderGlowColor = config.borderGlowColor || undefined;
    borderGlowColors =
      Array.isArray(config.borderGlowColors) && config.borderGlowColors.length > 0
        ? config.borderGlowColors
        : borderGlowColor
        ? [borderGlowColor]
        : undefined;
    borderGlowAngle = typeof config.borderGlowAngle === 'number' ? config.borderGlowAngle : 135;
    borderGlowOpacity = typeof config.borderGlowOpacity === 'number' ? config.borderGlowOpacity : 70;
  }

  const vars = getCustomThemeVars(
    colors,
    isDark,
    angle,
    borderColors,
    borderAnimation,
    borderGlowEnabled,
    borderGlowColors || borderGlowColor,
    borderGlowAngle,
    borderGlowOpacity,
    syncGlowWithBorder
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
    return { colors: ['#0ea5e9'], angle: 135, borderAnimation: true, borderGlowEnabled: true, syncGlowWithBorder: false, borderGlowOpacity: 70 };
  }
  const override = (window as any).__profileOverride;
  if (override?.customThemeColors && Array.isArray(override.customThemeColors) && override.customThemeColors.length > 0) {
    return {
      colors: override.customThemeColors,
      angle: typeof override.customThemeAngle === 'number' ? override.customThemeAngle : 135,
      borderColors: override.customBorderColors,
      borderAnimation: override.customBorderAnimation !== undefined ? Boolean(override.customBorderAnimation) : true,
      borderGlowEnabled: override.customBorderGlowEnabled !== undefined ? Boolean(override.customBorderGlowEnabled) : true,
      syncGlowWithBorder: Boolean(override.customBorderGlowSync || override.syncGlowWithBorder),
      borderGlowColor: override.customBorderGlowColor || undefined,
      borderGlowColors: override.customBorderGlowColors || (override.customBorderGlowColor ? [override.customBorderGlowColor] : undefined),
      borderGlowAngle: typeof override.customBorderGlowAngle === 'number' ? override.customBorderGlowAngle : 135,
      borderGlowOpacity: typeof override.customBorderGlowOpacity === 'number' ? override.customBorderGlowOpacity : 70,
    };
  }
  if (override?.customThemeColor) {
    return {
      colors: [override.customThemeColor],
      angle: 135,
      borderColors: override.customBorderColors,
      borderAnimation: override.customBorderAnimation !== undefined ? Boolean(override.customBorderAnimation) : true,
      borderGlowEnabled: override.customBorderGlowEnabled !== undefined ? Boolean(override.customBorderGlowEnabled) : true,
      syncGlowWithBorder: Boolean(override.customBorderGlowSync || override.syncGlowWithBorder),
      borderGlowColor: override.customBorderGlowColor || undefined,
      borderGlowColors: override.customBorderGlowColors || (override.customBorderGlowColor ? [override.customBorderGlowColor] : undefined),
      borderGlowAngle: typeof override.customBorderGlowAngle === 'number' ? override.customBorderGlowAngle : 135,
      borderGlowOpacity: typeof override.customBorderGlowOpacity === 'number' ? override.customBorderGlowOpacity : 70,
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
          syncGlowWithBorder: Boolean(cfg.customBorderGlowSync || cfg.syncGlowWithBorder),
          borderGlowColor: cfg.customBorderGlowColor || undefined,
          borderGlowColors: cfg.customBorderGlowColors || (cfg.customBorderGlowColor ? [cfg.customBorderGlowColor] : undefined),
          borderGlowAngle: typeof cfg.customBorderGlowAngle === 'number' ? cfg.customBorderGlowAngle : 135,
          borderGlowOpacity: typeof cfg.customBorderGlowOpacity === 'number' ? cfg.customBorderGlowOpacity : 70,
        };
      }
      if (cfg?.customThemeColor) {
        return {
          colors: [cfg.customThemeColor],
          angle: 135,
          borderColors: cfg.customBorderColors,
          borderAnimation: cfg.customBorderAnimation !== undefined ? Boolean(cfg.customBorderAnimation) : true,
          borderGlowEnabled: cfg.customBorderGlowEnabled !== undefined ? Boolean(cfg.customBorderGlowEnabled) : true,
          syncGlowWithBorder: Boolean(cfg.customBorderGlowSync || cfg.syncGlowWithBorder),
          borderGlowColor: cfg.customBorderGlowColor || undefined,
          borderGlowColors: cfg.customBorderGlowColors || (cfg.customBorderGlowColor ? [cfg.customBorderGlowColor] : undefined),
          borderGlowAngle: typeof cfg.customBorderGlowAngle === 'number' ? cfg.customBorderGlowAngle : 135,
          borderGlowOpacity: typeof cfg.customBorderGlowOpacity === 'number' ? cfg.customBorderGlowOpacity : 70,
        };
      }
    }
  } catch {}
  return { colors: ['#0ea5e9'], angle: 135, borderAnimation: true, borderGlowEnabled: true, syncGlowWithBorder: false, borderGlowOpacity: 70 };
}

export function getStoredCustomThemeColor(): string {
  return getStoredCustomThemeConfig().colors[0] || '#0ea5e9';
}
