const NOTO_VIET_WOFF =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-vietnamese@latest/latin-ext-700-normal.woff';

let cachedFont: ArrayBuffer | null = null;

export async function loadOgVietnameseFont(): Promise<ArrayBuffer | null> {
  if (cachedFont) return cachedFont;
  try {
    const res = await fetch(NOTO_VIET_WOFF, { cache: 'force-cache' });
    if (!res.ok) return null;
    cachedFont = await res.arrayBuffer();
    return cachedFont;
  } catch {
    return null;
  }
}

export function ogFontOptions(data: ArrayBuffer | null) {
  if (!data) return undefined;
  return [{ name: 'Noto Sans', data, style: 'normal' as const, weight: 700 as const }];
}
