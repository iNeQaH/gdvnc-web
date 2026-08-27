const fs = require('fs');
const path = require('path');

const mysqlEnvFile = path.join(__dirname, '..', '.env.mysql');
if (fs.existsSync(mysqlEnvFile) && !process.env.MYSQL_DATABASE_URL) {
  const raw = fs.readFileSync(mysqlEnvFile, 'utf8').trim().split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (raw) {
    process.env.MYSQL_DATABASE_URL = raw
      .replace(/^MYSQL_DATABASE_URL=/, '')
      .replace(/^DATABASE_URL=/, '')
      .replace(/^["']|["']$/g, '');
  }
}

const { PrismaClient } = require('@prisma/client');

const outDir = process.argv.find((a) => a.startsWith('--out='))?.slice(6)
  || path.join(__dirname, '..', 'backups', new Date().toISOString().slice(0, 10).replace(/-/g, ''));

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL } },
});

const TABLES = [
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

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const summary = {};
  for (const name of TABLES) {
    const rows = await prisma[name].findMany();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(rows));
    summary[name] = rows.length;
    console.log(`dumped ${name}: ${rows.length}`);
  }
  fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify({ at: new Date().toISOString(), summary }, null, 2));
  console.log('backup dir:', outDir);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
