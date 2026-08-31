/**
 * Move Image blobs (and data: avatar/cover URLs) from Postgres to UploadThing.
 * Writes leftover rows to scripts/uploadthing-leftover.json if a file is too large or upload fails.
 *
 *   node scripts/migrate-images-to-uploadthing.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { UTApi } = require('uploadthing/server');

const ROOT = path.join(__dirname, '..');
const MAX_BYTES = 16 * 1024 * 1024;
const leftoverPath = path.join(__dirname, 'uploadthing-leftover.json');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, '.env.local'));
loadEnv(path.join(ROOT, '.env'));

function parseDataUrl(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  if (parts.length !== 2) return null;
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const buffer = Buffer.from(parts[1], 'base64');
  if (!buffer.length) return null;
  return { mime, buffer };
}

function extFor(mime) {
  const ext = String(mime).split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg';
}

async function main() {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error('UPLOADTHING_TOKEN is not set (.env.local).');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — cannot migrate existing Image rows.');
  }

  const prisma = new PrismaClient();
  const utapi = new UTApi();
  const leftover = [];

  async function uploadBuffer(buffer, mime, name) {
    if (buffer.length > MAX_BYTES) {
      throw new Error(`too large (${buffer.length} bytes)`);
    }
    const file = new File([buffer], name, { type: mime });
    const result = await utapi.uploadFiles(file);
    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'upload failed');
    }
    return result.data.ufsUrl;
  }

  async function rewriteRef(ref, lookup) {
    if (!ref) return ref;
    const parts = String(ref)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const next = [];
    for (const part of parts) {
      const match = part.match(/^\/api\/images\/([^/?#]+)/);
      if (match && lookup.has(match[1])) {
        next.push(lookup.get(match[1]));
        continue;
      }
      if (part.startsWith('data:image/')) {
        const parsed = parseDataUrl(part);
        if (!parsed) {
          leftover.push({ kind: 'inline-data-url', preview: part.slice(0, 80) });
          continue;
        }
        try {
          next.push(await uploadBuffer(parsed.buffer, parsed.mime, `inline.${extFor(parsed.mime)}`));
        } catch (error) {
          leftover.push({ kind: 'inline-data-url', error: String(error.message || error), bytes: parsed.buffer.length });
        }
        continue;
      }
      next.push(part);
    }
    return next.length ? next.join(',') : null;
  }

  try {
    const images = await prisma.image.findMany({ select: { id: true, dataUrl: true, createdAt: true } });
    console.log(`Image rows: ${images.length}`);
    const lookup = new Map();

    for (const image of images) {
      if (image.dataUrl.startsWith('http://') || image.dataUrl.startsWith('https://')) {
        lookup.set(image.id, image.dataUrl);
        continue;
      }
      const parsed = parseDataUrl(image.dataUrl);
      if (!parsed) {
        leftover.push({ kind: 'image-row', id: image.id, error: 'invalid data URL' });
        continue;
      }
      try {
        const url = await uploadBuffer(parsed.buffer, parsed.mime, `${image.id}.${extFor(parsed.mime)}`);
        lookup.set(image.id, url);
        await prisma.image.update({ where: { id: image.id }, data: { dataUrl: url } });
        console.log(`uploaded ${image.id} -> ${url}`);
      } catch (error) {
        leftover.push({
          kind: 'image-row',
          id: image.id,
          bytes: parsed.buffer.length,
          createdAt: image.createdAt,
          error: String(error.message || error),
        });
        console.warn(`skip ${image.id}: ${error.message || error}`);
      }
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { avatarUrl: { not: null } },
          { coverUrl: { not: null } },
        ],
      },
      select: { id: true, avatarUrl: true, coverUrl: true },
    });
    for (const user of users) {
      const avatarUrl = await rewriteRef(user.avatarUrl, lookup);
      const coverUrl = await rewriteRef(user.coverUrl, lookup);
      if (avatarUrl !== user.avatarUrl || coverUrl !== user.coverUrl) {
        await prisma.user.update({ where: { id: user.id }, data: { avatarUrl, coverUrl } });
      }
    }

    const works = await prisma.creatorWork.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });
    for (const work of works) {
      const imageUrl = await rewriteRef(work.imageUrl, lookup);
      if (imageUrl !== work.imageUrl) {
        await prisma.creatorWork.update({ where: { id: work.id }, data: { imageUrl } });
      }
    }

    const events = await prisma.timelineEvent.findMany({
      where: { image: { not: null } },
      select: { id: true, image: true },
    });
    for (const event of events) {
      const image = await rewriteRef(event.image, lookup);
      if (image !== event.image) {
        await prisma.timelineEvent.update({ where: { id: event.id }, data: { image } });
      }
    }

    const migratedIds = [...lookup.keys()];
    if (migratedIds.length > 0) {
      await prisma.image.deleteMany({
        where: { id: { in: migratedIds }, dataUrl: { startsWith: 'http' } },
      });
    }

    fs.writeFileSync(leftoverPath, JSON.stringify(leftover, null, 2));
    console.log(`leftover: ${leftover.length} -> ${leftoverPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
