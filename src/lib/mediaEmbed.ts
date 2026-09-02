import { parseYoutubeVideoField } from '@/lib/timeline/glow';

export type MediaEmbedKind = 'youtube' | 'drive' | 'image' | 'link';

export function parseDriveFileId(url: string): string | null {
  const value = String(url || '').trim();
  if (!value) return null;
  const file = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) return file[1];
  const open = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return open ? open[1] : null;
}

export function isImageUrl(url: string): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  if (/^data:image\//i.test(value)) return true;
  if (/\/api\/images\//i.test(value)) return true;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(value);
}

export function splitMediaUrls(raw?: string | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function classifyMediaUrl(url: string): { kind: MediaEmbedKind; src: string } {
  const value = String(url || '').trim();
  const yt = parseYoutubeVideoField(value);
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt}` };
  const drive = parseDriveFileId(value);
  if (drive) return { kind: 'drive', src: `https://drive.google.com/file/d/${drive}/preview` };
  if (isImageUrl(value)) return { kind: 'image', src: value };
  return { kind: 'link', src: value };
}
