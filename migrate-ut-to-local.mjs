import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const localUrl = 'postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable';
const sql = postgres(localUrl);

const UPLOADS_DIR = path.join(process.cwd(), 'user-data', 'uploads');
const SNAPSHOTS_DIR = path.join(process.cwd(), 'user-data', 'snapshots');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

async function downloadFile(url, destDir, originalKey = null) {
  if (!url || (!url.includes('utfs.io') && !url.includes('ufs.sh'))) return url;
  
  try {
    let key = originalKey;
    if (!key) {
      const match = url.match(/\/f\/([^/?#]+)/);
      key = match ? decodeURIComponent(match[1]) : null;
    }
    if (!key) return url;
    
    // Some keys might not have extensions, we'll just save them as is for now
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const destPath = path.join(destDir, safeKey);
    
    if (!fs.existsSync(destPath)) {
      console.log(`Downloading ${url}...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    } else {
      console.log(`Already downloaded: ${safeKey}`);
    }
    
    // Return local URL
    return destDir === SNAPSHOTS_DIR 
      ? `/api/uploads/snapshots/${safeKey}` 
      : `/api/uploads/${safeKey}`;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    return url;
  }
}

async function migrate() {
  console.log('Migrating Users...');
  const users = await sql`SELECT id, "avatarUrl", "coverUrl" FROM "User" WHERE "avatarUrl" LIKE '%ufs%' OR "coverUrl" LIKE '%ufs%'`;
  for (const user of users) {
    const newAvatar = await downloadFile(user.avatarUrl, UPLOADS_DIR);
    const newCover = await downloadFile(user.coverUrl, UPLOADS_DIR);
    if (newAvatar !== user.avatarUrl || newCover !== user.coverUrl) {
      await sql`UPDATE "User" SET "avatarUrl" = ${newAvatar}, "coverUrl" = ${newCover} WHERE id = ${user.id}`;
    }
  }

  console.log('Migrating CreatorWorks...');
  const works = await sql`SELECT id, "imageUrl" FROM "CreatorWork" WHERE "imageUrl" LIKE '%ufs%'`;
  for (const work of works) {
    if (work.imageUrl) {
      const urls = work.imageUrl.split(',');
      const newUrls = [];
      for (const url of urls) {
        newUrls.push(await downloadFile(url.trim(), UPLOADS_DIR));
      }
      const newImageUrl = newUrls.join(',');
      if (newImageUrl !== work.imageUrl) {
        await sql`UPDATE "CreatorWork" SET "imageUrl" = ${newImageUrl} WHERE id = ${work.id}`;
      }
    }
  }

  console.log('Migrating TimelineEvents...');
  const timelines = await sql`SELECT id, "image" FROM "TimelineEvent" WHERE "image" LIKE '%ufs%'`;
  for (const t of timelines) {
    const newImg = await downloadFile(t.image, UPLOADS_DIR);
    if (newImg !== t.image) {
      await sql`UPDATE "TimelineEvent" SET "image" = ${newImg} WHERE id = ${t.id}`;
    }
  }
  
  console.log('Migrating List Snapshots...');
  const contents = await sql`SELECT key, html FROM "SiteContent" WHERE key LIKE 'list-snapshot:%'`;
  for (const content of contents) {
    try {
      const meta = JSON.parse(content.html);
      if (meta.url && (meta.url.includes('ufs.sh') || meta.url.includes('utfs.io'))) {
        const newUrl = await downloadFile(meta.url, SNAPSHOTS_DIR, meta.key);
        meta.url = newUrl;
        meta.key = `snapshots/${meta.key}`; // update local key reference
        await sql`UPDATE "SiteContent" SET html = ${JSON.stringify(meta)} WHERE key = ${content.key}`;
        console.log(`Updated snapshot ${content.key}`);
      }
    } catch(e) {
      // ignore
    }
  }

  console.log('Migration finished successfully!');
  process.exit(0);
}

migrate().catch(console.error);
