import React from 'react';

/**
 * Extracts a representative hex/rgb color from user's custom name styling (nameColor, nameGradient, nameGlow).
 */
export function extractUserThemeColor(user: any): string | null {
  if (!user) return null;
  if (user.nameColor && typeof user.nameColor === 'string' && user.nameColor.trim()) {
    return user.nameColor.trim();
  }
  if (user.nameGradient && typeof user.nameGradient === 'string') {
    const hexMatch = user.nameGradient.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/);
    if (hexMatch) return hexMatch[0];
    const rgbMatch = user.nameGradient.match(/rgba?\([^)]+\)/);
    if (rgbMatch) return rgbMatch[0];
  }
  if (user.nameGlow && typeof user.nameGlow === 'string') {
    const clean = user.nameGlow.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const hexMatch = clean.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/);
    if (hexMatch) return hexMatch[0];
    const rgbMatch = clean.match(/rgba?\([^)]+\)/);
    if (rgbMatch) return rgbMatch[0];
  }
  return null;
}

/**
 * Generates custom list row background & border styling matching the user's name color,
 * darkened so that bright text pops with high contrast across both light and dark themes.
 */
export function getUserListRowStyle(user: any, isDark: boolean): {
  hasCustomBg: boolean;
  style?: React.CSSProperties;
  color?: string;
} {
  const col = extractUserThemeColor(user);
  if (!col) return { hasCustomBg: false };

  // "để luôn background của item list của họ theo màu của tên họ nhưng tối hơn mà phù hợp cả sáng tối"
  // Deep tinted dark background for maximum readability of bright names in all themes:
  const bg = isDark
    ? `color-mix(in srgb, ${col} 15%, #0b0f19)`
    : `color-mix(in srgb, ${col} 18%, #111827)`;

  const border = isDark
    ? `color-mix(in srgb, ${col} 35%, transparent)`
    : `color-mix(in srgb, ${col} 45%, transparent)`;

  return {
    hasCustomBg: true,
    color: col,
    style: {
      backgroundColor: bg,
      borderColor: border,
    },
  };
}
