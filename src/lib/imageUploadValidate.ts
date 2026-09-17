const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export function allowedImageExtension(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() || filename;
  const dot = base.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  return ext === 'jpeg' ? 'jpg' : ext;
}

export function detectImageKind(buffer: Buffer): 'jpg' | 'png' | 'gif' | 'webp' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'gif';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function validateImageUpload(
  buffer: Buffer,
  filename: string
): { ok: true; ext: string } | { ok: false; error: string } {
  const extFromName = allowedImageExtension(filename);
  if (!extFromName) {
    return { ok: false, error: 'Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif.' };
  }
  const kind = detectImageKind(buffer);
  if (!kind) {
    return { ok: false, error: 'Nội dung file không phải ảnh hợp lệ.' };
  }
  if (kind !== extFromName) {
    return { ok: false, error: 'Phần mở rộng file không khớp nội dung ảnh.' };
  }
  return { ok: true, ext: kind };
}
