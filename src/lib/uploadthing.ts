import { UTApi } from 'uploadthing/server';

const IMAGE_ID_RE = /\/api\/images\/([A-Za-z0-9_-]+)/g;
const UT_HOST = /(^|\.)((utfs\.io)|(ufs\.sh))$/i;

let cached: UTApi | null = null;

export function utapi() {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error('UPLOADTHING_TOKEN is not set.');
  }
  if (!cached) cached = new UTApi();
  return cached;
}

export function isUploadthingUrl(url: string) {
  try {
    return UT_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isAllowedImageRef(url: string | null | undefined, maxLen = 500) {
  const value = String(url ?? '').trim();
  if (!value) return true;
  if (value.length > maxLen) return false;
  if (value.startsWith('/api/images/')) return value.length <= 200;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function uploadthingKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!UT_HOST.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/f\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function publicUrlForKey(key: string) {
  try {
    const raw = Buffer.from(process.env.UPLOADTHING_TOKEN || '', 'base64').toString('utf8');
    const appId = JSON.parse(raw)?.appId;
    if (typeof appId === 'string' && appId) {
      return `https://${appId}.ufs.sh/f/${key}`;
    }
  } catch {
    /* fall through */
  }
  return `https://utfs.io/f/${key}`;
}

function mimeToName(mime: string, fallback = 'image.jpg') {
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  if (!/^[a-z0-9]+$/i.test(ext)) return fallback;
  return `image.${ext}`;
}

export async function uploadBufferToUt(
  buffer: Buffer,
  mime = 'image/jpeg',
  filename?: string
): Promise<{ url: string; key: string }> {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  const file = new File([bytes], filename || mimeToName(mime), { type: mime });
  const result = await utapi().uploadFiles(file);
  if (result.error || !result.data) {
    throw new Error(result.error?.message || 'UploadThing upload failed.');
  }
  return { url: result.data.ufsUrl, key: result.data.key };
}

export async function uploadDataUrlToUt(dataUrl: string, filename?: string): Promise<string> {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) throw new Error('Invalid image data');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const buffer = Buffer.from(parts[1], 'base64');
  const uploaded = await uploadBufferToUt(buffer, mime, filename);
  return uploaded.url;
}

export function imageIdsFromRef(ref: string | null | undefined): string[] {
  if (!ref) return [];
  return [...ref.matchAll(IMAGE_ID_RE)].map((m) => m[1]);
}

export function uploadthingKeysFromRef(ref: string | null | undefined): string[] {
  if (!ref) return [];
  return ref
    .split(',')
    .map((part) => uploadthingKeyFromUrl(part.trim()))
    .filter((key): key is string => Boolean(key));
}

export async function deleteUploadthingKeys(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;
  await utapi().deleteFiles(unique);
}

export async function deleteStoredImages(ref: string | null | undefined) {
  await deleteUploadthingKeys(uploadthingKeysFromRef(ref));
}
