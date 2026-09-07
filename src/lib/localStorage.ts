import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function getUserDataDir() {
  const dir = process.env.USER_DATA_DIR || path.join(process.cwd(), 'user-data');
  return dir;
}

export function ensureLocalDirs() {
  const base = getUserDataDir();
  const uploads = path.join(base, 'uploads');
  const snapshots = path.join(base, 'snapshots');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
  if (!fs.existsSync(snapshots)) fs.mkdirSync(snapshots, { recursive: true });
  return { base, uploads, snapshots };
}

function mimeToExt(mime: string, fallback = 'jpg') {
  if (!mime) return fallback;
  const match = mime.match(/\/(jpeg|jpg|png|webp|gif|json)/i);
  if (match) {
    if (match[1].toLowerCase() === 'jpeg') return 'jpg';
    return match[1].toLowerCase();
  }
  return fallback;
}

export async function uploadBufferToLocal(
  buffer: Buffer,
  mime = 'image/jpeg',
  originalFilename?: string
): Promise<{ url: string; key: string }> {
  const { uploads } = ensureLocalDirs();
  const ext = mimeToExt(mime);
  const uuid = crypto.randomUUID().split('-')[0];
  const safeFilename = originalFilename 
    ? originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '') 
    : `file`;
  
  const key = `${Date.now()}-${uuid}-${safeFilename}`;
  const finalKey = key.includes('.') ? key : `${key}.${ext}`;
  
  const destPath = path.join(uploads, finalKey);
  await fs.promises.writeFile(destPath, buffer);
  
  return { url: `/api/uploads/${finalKey}`, key: finalKey };
}

export async function uploadDataUrlToLocal(dataUrl: string, filename?: string): Promise<string> {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) throw new Error('Invalid image data');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const buffer = Buffer.from(parts[1], 'base64');
  
  const uploaded = await uploadBufferToLocal(buffer, mime, filename);
  return uploaded.url;
}

export async function deleteLocalFiles(keys: string[]) {
  if (!keys || keys.length === 0) return;
  const { uploads } = ensureLocalDirs();
  const unique = [...new Set(keys.filter(Boolean))];
  
  for (const key of unique) {
    const safeKey = key.replace(/(\.\.[\/\\])/g, ''); // basic traversal protection
    const filePath = path.join(uploads, safeKey);
    
    // ensure path stays within uploads directory
    if (filePath.startsWith(uploads + path.sep) || filePath === path.join(uploads, safeKey)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to delete local file: ${filePath}`, err);
        }
      }
    }
  }
}
