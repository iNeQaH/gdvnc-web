import {
  uploadBufferToLocal,
  uploadDataUrlToLocal,
  deleteLocalFiles
} from './localStorage';

const IMAGE_ID_RE = /\/api\/images\/([A-Za-z0-9_-]+)/g;
const UT_HOST = /(^|\.)((utfs\.io)|(ufs\.sh))$/i;

export function getUploadthingToken() {
  return '';
}

export function utapi() {
  throw new Error('UploadThing is no longer supported. Use local storage helpers instead.');
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
  if (value.startsWith('/api/images/') || value.startsWith('/api/uploads/') || value.startsWith('/uploads/')) {
    return value.length <= 200;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function uploadthingKeyFromUrl(url: string): string | null {
  try {
    if (url.startsWith('/api/uploads/')) {
      const parts = url.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    }
    const parsed = new URL(url);
    if (!UT_HOST.test(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/f\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function publicUrlForKey(key: string) {
  if (key.includes('-')) {
    return `/api/uploads/${key}`; // local heuristic
  }
  return `https://utfs.io/f/${key}`;
}

export async function uploadBufferToUt(
  buffer: Buffer,
  mime = 'image/jpeg',
  filename?: string
): Promise<{ url: string; key: string }> {
  return uploadBufferToLocal(buffer, mime, filename);
}

export async function uploadDataUrlToUt(dataUrl: string, filename?: string): Promise<string> {
  return uploadDataUrlToLocal(dataUrl, filename);
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
  return deleteLocalFiles(keys);
}

export async function deleteStoredImages(ref: string | null | undefined) {
  await deleteUploadthingKeys(uploadthingKeysFromRef(ref));
}
