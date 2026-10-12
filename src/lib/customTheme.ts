/**
 * Dynamic Custom Theme Generator based on HSL (Hue, Saturation, Lightness/Brightness)
 * Exclusively for Supporters: Derives all page elements (backgrounds, cards, borders, text, accents)
 * from a single primary custom color.
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
] as const;

export function getCustomThemeVars(baseColorHex: string, isDark: boolean): Record<string, string> {
  const { h, s, l } = hexToHsl(baseColorHex || '#0ea5e9');

  if (isDark) {
    return {
      '--bg-page': `hsl(${h}, ${Math.round(Math.min(s, 30))}%, 8%)`,
      '--bg-card': `hsl(${h}, ${Math.round(Math.min(s, 22))}%, 13%)`,
      '--bg-subtle': `hsl(${h}, ${Math.round(Math.min(s, 24))}%, 10%)`,
      '--border-ui': `hsl(${h}, ${Math.round(Math.min(s, 25))}%, 24%)`,
      '--border-subtle': `hsl(${h}, ${Math.round(Math.min(s, 20))}%, 18%)`,
      '--text-title': `hsl(${h}, ${Math.round(Math.min(s, 15))}%, 96%)`,
      '--text-body': `hsl(${h}, ${Math.round(Math.min(s, 15))}%, 85%)`,
      '--text-dim': `hsl(${h}, ${Math.round(Math.min(s, 15))}%, 62%)`,
      '--accent': `hsl(${h}, ${s}%, ${Math.max(52, l)}%)`,
      '--accent-hover': `hsl(${h}, ${s}%, ${Math.max(42, l - 8)}%)`,
      '--accent-bg': `hsl(${h}, ${Math.round(Math.min(s, 60))}%, 22%)`,
      '--accent-text': `hsl(${h}, ${Math.round(Math.min(s, 40))}%, 92%)`,
      '--accent-fg': '#ffffff',
    };
  }

  // Light mode
  return {
    '--bg-page': `hsl(${h}, ${Math.round(Math.min(s, 25))}%, 96%)`,
    '--bg-card': '#ffffff',
    '--bg-subtle': `hsl(${h}, ${Math.round(Math.min(s, 22))}%, 97%)`,
    '--border-ui': `hsl(${h}, ${Math.round(Math.min(s, 28))}%, 82%)`,
    '--border-subtle': `hsl(${h}, ${Math.round(Math.min(s, 20))}%, 91%)`,
    '--text-title': `hsl(${h}, ${Math.round(Math.min(s, 40))}%, 12%)`,
    '--text-body': `hsl(${h}, ${Math.round(Math.min(s, 30))}%, 26%)`,
    '--text-dim': `hsl(${h}, ${Math.round(Math.min(s, 20))}%, 48%)`,
    '--accent': `hsl(${h}, ${s}%, ${l}%)`,
    '--accent-hover': `hsl(${h}, ${s}%, ${Math.max(10, l - 8)}%)`,
    '--accent-bg': `hsl(${h}, ${Math.round(Math.min(s, 45))}%, 93%)`,
    '--accent-text': `hsl(${h}, ${Math.round(Math.max(s, 60))}%, ${Math.min(36, Math.max(20, l - 15))}%)`,
    '--accent-fg': l > 65 ? '#000000' : '#ffffff',
  };
}

export function applyCustomThemeVars(root: HTMLElement, baseColorHex: string, isDark: boolean): void {
  const vars = getCustomThemeVars(baseColorHex, isDark);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

export function removeCustomThemeVars(root: HTMLElement): void {
  for (const key of CUSTOM_THEME_KEYS) {
    root.style.removeProperty(key);
  }
}

export function getStoredCustomThemeColor(): string {
  if (typeof window === 'undefined') return '#0ea5e9';
  const override = (window as any).__profileOverride;
  if (override?.customThemeColor) {
    return override.customThemeColor;
  }
  try {
    const raw = localStorage.getItem('gdvnc_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.profileConfig?.customThemeColor) {
        return u.profileConfig.customThemeColor;
      }
    }
  } catch {}
  return '#0ea5e9';
}
