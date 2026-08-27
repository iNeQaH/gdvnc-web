const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SQL_PATH = process.argv.find((a) => a.endsWith('.sql')) || 'D:\\Downloads\\dl_fl_pl.sql';
const DRY_RUN = process.argv.includes('--dry-run');

const MAX_PP = 2500;
const MIN_PP = 10;
const LIST_SIZE = 150;

function calculateBasePp(placement) {
  if (placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;
  const k = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);
  return Number((MIN_PP * Math.exp(k * (LIST_SIZE - placement))).toFixed(2));
}

function youtubeId(videoID) {
  if (!videoID) return null;
  const s = String(videoID).trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}

function parseField(raw) {
  const v = raw.trim();
  if (!v || v === 'NULL') return null;
  if (v === 'TRUE') return true;
  if (v === 'FALSE') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  return v;
}

function parseTuples(blob) {
  const rows = [];
  let i = 0;
  while (i < blob.length) {
    while (i < blob.length && blob[i] !== '(') i++;
    if (i >= blob.length) break;

    const fields = [];
    let current = '';
    let inString = false;
    i++;
    while (i < blob.length) {
      const c = blob[i];
      if (inString) {
        if (c === "'" && blob[i + 1] === "'") {
          current += "'";
          i += 2;
          continue;
        }
        if (c === "'") {
          inString = false;
          i++;
          if (blob.slice(i, i + 7) === '::jsonb') i += 7;
          continue;
        }
        current += c;
        i++;
        continue;
      }
      if (c === "'") {
        inString = true;
        i++;
        continue;
      }
      if (c === ',') {
        fields.push(parseField(current));
        current = '';
        i++;
        continue;
      }
      if (c === ')') {
        fields.push(parseField(current));
        rows.push(fields);
        i++;
        break;
      }
      current += c;
      i++;
    }
  }
  return rows;
}

function extractTableRows(sql, table) {
  const marker = `INSERT INTO public."${table}"`;
  const chunks = [];
  let from = 0;
  while (true) {
    const start = sql.indexOf(marker, from);
    if (start < 0) break;
    const valuesAt = sql.indexOf('VALUES', start);
    if (valuesAt < 0) break;
    let end = sql.indexOf('\nINSERT INTO', valuesAt + 6);
    const nextTable = sql.indexOf('\n-- ===================== TABLE:', valuesAt + 6);
    if (end < 0 || (nextTable > 0 && nextTable < end)) end = nextTable;
    if (end < 0) end = sql.length;
    chunks.push(sql.slice(valuesAt + 6, end));
    from = valuesAt + 6;
  }
  return chunks.flatMap(parseTuples);
}

const COLS = [
  'id', 'name', 'creator', 'videoID', 'minProgress', 'flTop', 'dlTop', 'flPt',
  'rating', 'created_at', 'isPlatformer', 'insaneTier', 'accepted', 'isNonList',
  'difficulty', 'isChallenge', 'creatorId', 'main_level_id', 'nameFts', 'creatorFts',
  'creatorData', 'levelsTags', 'record',
];

function rowToObj(fields) {
  const o = {};
  COLS.forEach((k, i) => { o[k] = fields[i] ?? null; });
  return o;
}

function classicMinPercent(minProgress) {
  if (minProgress == null) return 100;
  const n = Number(minProgress);
  if (!Number.isFinite(n) || n < 0 || n > 100) return 100;
  return n;
}

function toLevel(row, mode, placement) {
  const gdLevelId = Number(row.id);
  if (!gdLevelId) return null;
  return {
    gdLevelId,
    name: String(row.name || 'Unknown').slice(0, 191),
    creatorName: row.creator ? String(row.creator).trim() : 'Unknown',
    youtubeId: youtubeId(row.videoID),
    minPercent: mode === 'PLATFORMER' ? 100 : classicMinPercent(row.minProgress),
    placement,
    mode,
    difficulty: row.difficulty || (mode === 'PLATFORMER' ? 'Platformer' : 'Extreme Demon'),
    difficultyFace: 10,
    ratingType: 'NONE',
    isVN: false,
    isChallenge: !!row.isChallenge,
    basePp: placement ? calculateBasePp(placement) : 0,
  };
}

async function upsertLevels(levels, label) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const lvl of levels) {
    if (!lvl) { skipped++; continue; }
    const existing = DRY_RUN ? null : await prisma.level.findUnique({ where: { gdLevelId: lvl.gdLevelId } });
    if (existing) {
      await prisma.level.update({
        where: { gdLevelId: lvl.gdLevelId },
        data: {
          name: lvl.name,
          creatorName: lvl.creatorName,
          youtubeId: lvl.youtubeId || existing.youtubeId,
          minPercent: lvl.minPercent,
          placement: lvl.placement,
          mode: lvl.mode,
          difficulty: lvl.difficulty,
          basePp: lvl.basePp,
          isChallenge: lvl.isChallenge || existing.isChallenge,
        },
      });
      updated++;
    } else {
      await prisma.level.create({ data: lvl });
      created++;
    }
    if ((created + updated) % 50 === 0) {
      console.log(`  ${label}: ${created + updated}/${levels.length}`);
    }
  }
  return { created, updated, skipped };
}

async function recalcAllServerPp() {
  const ranked = await prisma.level.findMany({
    where: { placement: { not: null } },
    select: { id: true, placement: true, basePp: true },
  });
  let n = 0;
  for (const lvl of ranked) {
    const correctPp = calculateBasePp(lvl.placement);
    if (Math.abs(correctPp - lvl.basePp) > 0.01) {
      await prisma.level.update({ where: { id: lvl.id }, data: { basePp: correctPp } });
      n++;
    }
  }
  return { ranked: ranked.length, updated: n };
}

function asRecordList(raw) {
  if (raw == null || raw === 'NULL') return [];
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.players)) return data.players;
  }
  return [];
}

function pickPlayerName(item) {
  if (!item || typeof item !== 'object') return '';
  return String(item.player || item.playerName || item.username || item.user || item.account || item.name || '').trim();
}

async function importLegacyRecords(rows, label) {
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const list = asRecordList(row.record);
    if (!list.length) { skipped++; continue; }
    const gdLevelId = Number(row.id);
    if (!gdLevelId) continue;
    const level = DRY_RUN ? null : await prisma.level.findUnique({ where: { gdLevelId } });
    if (!DRY_RUN && !level) continue;
    for (const item of list) {
      const player = pickPlayerName(item);
      if (!player) continue;
      const progressRaw = item.progress ?? item.percent ?? item.percentage;
      const progress = Number.isFinite(Number(progressRaw)) ? Number(progressRaw) : 100;
      const timeRaw = item.timeMs ?? item.time;
      const timeMs = Number.isFinite(Number(timeRaw)) ? Number(timeRaw) : null;
      const video = item.video || item.videoUrl || item.link
        || (row.videoID ? `https://youtu.be/${youtubeId(row.videoID) || row.videoID}` : 'https://www.youtube.com/watch?v=legacy');
      if (DRY_RUN) { created++; continue; }
      const exists = await prisma.record.findFirst({
        where: {
          levelId: level.id,
          userId: null,
          legacyPlayerName: { equals: player, mode: 'insensitive' },
        },
      });
      if (exists) continue;
      await prisma.record.create({
        data: {
          userId: null,
          legacyPlayerName: player,
          levelId: level.id,
          progress,
          timeMs,
          videoUrl: String(video).slice(0, 500),
          status: 'APPROVED',
          submittedAt: item.date || item.submittedAt ? new Date(item.date || item.submittedAt) : new Date(),
        },
      });
      created++;
    }
  }
  console.log(`Legacy records ${label}: created=${created} emptyLevels=${skipped}`);
  return { created, skipped };
}

async function main() {
  if (!fs.existsSync(SQL_PATH)) {
    throw new Error(`Không tìm thấy file: ${SQL_PATH}`);
  }
  console.log(`Reading ${SQL_PATH}${DRY_RUN ? ' (dry-run)' : ''}...`);
  const sql = fs.readFileSync(SQL_PATH, 'utf8');

  const dl = extractTableRows(sql, 'dl').map(rowToObj);
  const fl = extractTableRows(sql, 'fl').map(rowToObj);
  const pl = extractTableRows(sql, 'pl').map(rowToObj);
  console.log(`Parsed dl=${dl.length} fl=${fl.length} pl=${pl.length}`);

  const dlIds = new Set(dl.map((r) => Number(r.id)));

  const classic = dl
    .filter((r) => !r.isNonList && r.dlTop != null)
    .map((r) => toLevel(r, r.isPlatformer ? 'PLATFORMER' : 'CLASSIC', Number(r.dlTop)))
    .filter(Boolean);

  const futureOnly = fl
    .filter((r) => !r.isNonList && !dlIds.has(Number(r.id)))
    .map((r) => toLevel(r, 'CLASSIC', null))
    .filter(Boolean);

  const platformer = pl
    .filter((r) => !r.isNonList && r.dlTop != null)
    .map((r) => toLevel(r, 'PLATFORMER', Number(r.dlTop)))
    .filter(Boolean);

  function uniqueRanked(levels, label) {
    const seen = new Set();
    const out = [];
    let dropped = 0;
    for (const l of levels) {
      if (!l || l.placement == null) { out.push(l); continue; }
      const key = `${l.mode}:${l.placement}`;
      if (seen.has(key)) { dropped++; continue; }
      seen.add(key);
      out.push(l);
    }
    if (dropped) console.log(`Dropped ${dropped} duplicate ${label} ranks`);
    return out;
  }

  const classicUnique = uniqueRanked(classic, 'classic');
  const platformerUnique = uniqueRanked(platformer, 'platformer');
  console.log(`Will upsert classic(ranked)=${classicUnique.length} future(unranked)=${futureOnly.length} platformer=${platformerUnique.length}`);

  if (!DRY_RUN) {
    const cleared = await prisma.level.updateMany({
      where: { isChallenge: false, placement: { not: null } },
      data: { placement: null, basePp: 0 },
    });
    console.log(`Cleared old placements: ${cleared.count}`);
  }

  const a = await upsertLevels(classicUnique, 'classic');
  const b = await upsertLevels(futureOnly, 'future');
  const c = await upsertLevels(platformerUnique, 'platformer');
  console.log('Classic:', a);
  console.log('Future (unranked extras):', b);
  console.log('Platformer:', c);

  const recA = await importLegacyRecords(dl, 'dl');
  const recB = await importLegacyRecords(fl, 'fl');
  const recC = await importLegacyRecords(pl, 'pl');
  console.log('Legacy records:', { dl: recA, fl: recB, pl: recC });

  if (!DRY_RUN) {
    const pp = await recalcAllServerPp();
    console.log('PP recalc:', pp);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
