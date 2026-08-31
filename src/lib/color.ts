const HEX6 = /^#?([0-9a-fA-F]{6})$/;

export function parseHex(value: unknown): string | null {
  const m = String(value ?? '').trim().match(HEX6);
  return m ? `#${m[1].toLowerCase()}` : null;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const parsed = parseHex(hex);
  if (!parsed) return null;
  return [
    Number.parseInt(parsed.slice(1, 3), 16),
    Number.parseInt(parsed.slice(3, 5), 16),
    Number.parseInt(parsed.slice(5, 7), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number) {
  const byte = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
  }
  const s = max === 0 ? 0 : d / max;
  return [h * 360, s, max];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hexToHsv(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsv(rgb[0], rgb[1], rgb[2]);
}

export function hsvToHex(h: number, s: number, v: number) {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export function hueCss(h: number) {
  return `hsl(${((h % 360) + 360) % 360} 100% 50%)`;
}
