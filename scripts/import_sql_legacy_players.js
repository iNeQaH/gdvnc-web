const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SQL_PATH = process.argv.find((a) => a.endsWith('.sql')) || 'D:\\Downloads\\dl_fl_pl.sql';
const API = 'https://api.gdlisthub.dev/levels';
const PAGE = 500;
const FETCH_CONCURRENCY = 6;
const INSERT_BATCH = 80;

function extractLevelIds(sql) {
  const ids = new Set();
  for (const m of sql.matchAll(/\((\d+), '/g)) ids.add(Number(m[1]));
  return [...ids];
}

function playerName(rec) {
  const n = rec?.players?.name;
  return n ? String(n).trim() : '';
}

function isAccepted(rec) {
  return Boolean(rec.acceptedManually || rec.acceptedAuto || rec.isChecked);
}

function videoUrl(rec) {
  const v = String(rec.videoLink || rec.video || '').trim();
  return (v || 'https://www.youtube.com/watch?v=legacy').slice(0, 500);
}

function submittedAt(rec) {
  const ts = Number(rec.timestamp);
  if (Number.isFinite(ts) && ts > 1e11) return new Date(ts);
  if (Number.isFinite(ts) && ts > 1e9) return new Date(ts * 1000);
  return new Date();
}

async function fetchAcceptedRecords(gdLevelId) {
  const out = [];
  let start = 0;
  while (true) {
    const url = `${API}/${gdLevelId}/records?start=${start}&end=${start + PAGE - 1}&isChecked=true`;
    const r = await fetch(url);
    if (r.status === 404) return out;
    if (!r.ok) throw new Error(`HTTP ${r.status} level ${gdLevelId}`);
    const data = await r.json();
    const rows = Array.isArray(data) ? data : [];
    out.push(...rows.filter(isAccepted));
    if (rows.length < PAGE) break;
    start += PAGE;
  }
  return out;
}

async function mapPool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  if (!fs.existsSync(SQL_PATH)) throw new Error(`Không tìm thấy ${SQL_PATH}`);
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const sqlIds = extractLevelIds(sql);
  console.log(`SQL level ids: ${sqlIds.length} (ranks will not be changed)`);

  const beforeRanks = await prisma.level.findMany({
    where: { placement: { in: [1, 2, 3] }, mode: 'CLASSIC' },
    select: { gdLevelId: true, name: true, placement: true },
    orderBy: { placement: 'asc' },
  });

  const levels = await prisma.level.findMany({
    where: { gdLevelId: { in: sqlIds } },
    select: { id: true, gdLevelId: true },
  });
  const levelByGd = new Map(levels.map((l) => [l.gdLevelId, l.id]));
  console.log(`Matching levels in DB: ${levelByGd.size}`);

  const existing = await prisma.record.findMany({
    where: { status: { in: ['APPROVED', 'PENDING'] } },
    select: {
      levelId: true,
      legacyPlayerName: true,
      user: { select: { gdUsername: true } },
    },
  });
  const seen = new Set();
  for (const rec of existing) {
    for (const n of [rec.legacyPlayerName, rec.user?.gdUsername]) {
      if (n) seen.add(`${rec.levelId}|${n.trim().toLowerCase()}`);
    }
  }

  const toInsert = [];
  let fetchedLevels = 0;
  let emptyLevels = 0;
  let fetchedRows = 0;

  await mapPool(sqlIds, FETCH_CONCURRENCY, async (gdLevelId) => {
    const levelId = levelByGd.get(gdLevelId);
    if (!levelId) return;
    let rows = [];
    try {
      rows = await fetchAcceptedRecords(gdLevelId);
    } catch (e) {
      console.warn(`Skip ${gdLevelId}: ${e.message}`);
      return;
    }
    fetchedLevels++;
    if (!rows.length) { emptyLevels++; return; }
    fetchedRows += rows.length;
    for (const rec of rows) {
      const name = playerName(rec);
      if (!name) continue;
      const key = `${levelId}|${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const progress = Number.isFinite(Number(rec.progress)) ? Number(rec.progress) : 100;
      const hz = Number(rec.refreshRate);
      toInsert.push({
        userId: null,
        legacyPlayerName: name,
        levelId,
        progress,
        videoUrl: videoUrl(rec),
        hz: Number.isFinite(hz) && hz > 0 ? hz : null,
        device: rec.mobile ? 'Mobile' : 'PC',
        comment: rec.comment ? String(rec.comment).slice(0, 2000) : null,
        status: 'APPROVED',
        submittedAt: submittedAt(rec),
      });
    }
    if (fetchedLevels % 50 === 0) {
      console.log(`  fetched ${fetchedLevels}/${levelByGd.size} levels, queued=${toInsert.length}`);
    }
  });

  console.log(`Fetched accepted rows=${fetchedRows} emptyLevels=${emptyLevels} toInsert=${toInsert.length}`);

  let created = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const batch = toInsert.slice(i, i + INSERT_BATCH);
    await prisma.record.createMany({ data: batch });
    created += batch.length;
    if (created % 400 === 0 || created === toInsert.length) {
      console.log(`  inserted ${created}/${toInsert.length}`);
    }
  }

  const afterRanks = await prisma.level.findMany({
    where: { placement: { in: [1, 2, 3] }, mode: 'CLASSIC' },
    select: { gdLevelId: true, name: true, placement: true },
    orderBy: { placement: 'asc' },
  });
  const unclaimed = await prisma.record.count({ where: { userId: null } });
  const players = await prisma.record.findMany({
    where: { userId: null },
    distinct: ['legacyPlayerName'],
    select: { legacyPlayerName: true },
  });

  console.log(JSON.stringify({
    created,
    unclaimedRecords: unclaimed,
    distinctLegacyNames: players.length,
    ranksBefore: beforeRanks,
    ranksAfter: afterRanks,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
