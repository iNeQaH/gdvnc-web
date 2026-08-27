require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isPlaceholder(url) {
  if (!url) return false;
  let decoded = url;
  try { decoded = decodeURIComponent(url.replace(/\+/g, ' ')); } catch {}
  const n = decoded.toLowerCase();
  return n.includes('submitted via death count') || n.includes('watch?v=legacy') || /\/levels\/submitted/i.test(n);
}

async function main() {
  const candidates = await prisma.record.findMany({
    where: {
      OR: [
        { videoUrl: { contains: 'Submitted via Death Count', mode: 'insensitive' } },
        { videoUrl: { contains: 'Submitted%20via%20Death%20Count', mode: 'insensitive' } },
        { videoUrl: { contains: 'watch?v=legacy', mode: 'insensitive' } },
        { videoUrl: { contains: '/levels/Submitted', mode: 'insensitive' } },
      ],
    },
    select: { id: true, userId: true, videoUrl: true, legacyPlayerName: true },
  });
  const rows = candidates.filter((r) => isPlaceholder(r.videoUrl));
  console.log('candidates', candidates.length, 'toDelete', rows.length);
  if (rows[0]) console.log('sample', rows[0].videoUrl);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    const result = await prisma.record.deleteMany({ where: { id: { in: ids } } });
    console.log('deleted', result.count);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
