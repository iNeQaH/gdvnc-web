const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dir = process.argv.find((a) => a.startsWith('--dir='))?.slice(6)
  || path.join(__dirname, '..', 'backups', '20260827');

const ORDER = [
  'badgeCategory',
  'badge',
  'user',
  'level',
  'record',
  'userBadge',
  'creatorWork',
  'levelSubmission',
  'notification',
  'helpRequest',
  'image',
];

function reviveDates(row) {
  const out = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      out[k] = new Date(v);
    }
  }
  return out;
}

async function insertAll(model, rows) {
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map(reviveDates);
    await prisma[model].createMany({ data: chunk, skipDuplicates: true });
    inserted += chunk.length;
    if (rows.length > chunkSize) {
      console.log(`  ${model}: ${Math.min(inserted, rows.length)}/${rows.length}`);
    }
  }
  return inserted;
}

async function main() {
  if (!fs.existsSync(dir)) {
    throw new Error('Backup folder not found: ' + dir);
  }
  console.log('Importing from', dir);
  for (const name of ORDER) {
    const file = path.join(dir, `${name}.json`);
    if (!fs.existsSync(file)) {
      console.log('skip missing', name);
      continue;
    }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(name + ': 0');
      continue;
    }
    const n = await insertAll(name, rows);
    console.log(name + ':', n);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
