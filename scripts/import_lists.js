const fs = require('fs');
const os = require('os');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined
);

const WIPE = process.argv.includes('--wipe');
const ONLY_PEMON = process.argv.includes('--pemonlist');
const RESTORE_ONLY = process.argv.includes('--restore-backup');
const SYNC_REQUIREMENT = process.argv.includes('--sync-requirement');
const MAX_PP = 2500;
const MIN_PP = 10;
const LIST_SIZE = 150;
const MIN_PROGRESS_SCORE_RATIO = 0.1;
const BACKUP_PATH = path.join(os.tmpdir(), 'gdvnc-records-backup.json');

function calculateBasePp(placement) {
  if (placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;
  const k = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);
  return Number((MIN_PP * Math.exp(k * (LIST_SIZE - placement))).toFixed(2));
}

function calculateTotalPp(basePps) {
  if (!basePps || basePps.length === 0) return 0;
  const sorted = [...basePps].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) total += sorted[i] * Math.pow(0.95, i);
  return Number(total.toFixed(2));
}

function awardedPpForProgress(progress, minPercent, basePp) {
  const p = progress ?? 0;
  const req = Math.min(100, Math.max(1, minPercent || 100));
  if (p < req) return 0;
  if (p >= 100 || req >= 100) return Number(basePp.toFixed(2));
  const t = (p - req) / (100 - req);
  const ratio = MIN_PROGRESS_SCORE_RATIO + (1 - MIN_PROGRESS_SCORE_RATIO) * t;
  return Number((basePp * ratio).toFixed(2));
}

function extractYoutubeId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const ytMatch = s.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return ytMatch ? ytMatch[1] : null;
}

function isRecordBetter(a, b, mode) {
  if (mode === 'PLATFORMER') {
    if (a.timeMs == null) return false;
    if (b.timeMs == null) return true;
    if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs;
    return new Date(a.submittedAt) > new Date(b.submittedAt);
  }
  const ap = a.progress ?? 0;
  const bp = b.progress ?? 0;
  if (ap !== bp) return ap > bp;
  return new Date(a.submittedAt) > new Date(b.submittedAt);
}

async function backupAndWipeLevels() {
  console.log('Backing up records before wipe...');
  const records = await prisma.record.findMany({
    include: { level: { select: { gdLevelId: true } } },
  });
  const backup = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    gdLevelId: r.level.gdLevelId,
    progress: r.progress,
    timeMs: r.timeMs,
    videoUrl: r.videoUrl,
    rawProofUrl: r.rawProofUrl,
    hz: r.hz,
    fps: r.fps,
    device: r.device,
    comment: r.comment,
    status: r.status,
    rejectReason: r.rejectReason,
    prioritySp: r.prioritySp,
    reviewerId: r.reviewerId,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
  }));
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup));
  console.log(`Saved ${backup.length} records to ${BACKUP_PATH}`);

  const deleted = await prisma.level.deleteMany({});
  console.log(`Wiped ${deleted.count} levels (records cascaded).`);
  return backup;
}

async function restoreRecords(backup) {
  const levels = await prisma.level.findMany({ select: { id: true, gdLevelId: true } });
  const byGd = new Map(levels.map((l) => [l.gdLevelId, l.id]));
  let restored = 0;
  let skipped = 0;

  for (const rec of backup) {
    const levelId = byGd.get(rec.gdLevelId);
    if (!levelId) {
      skipped++;
      continue;
    }
    try {
      await prisma.record.create({
        data: {
          id: rec.id,
          userId: rec.userId,
          levelId,
          progress: rec.progress,
          timeMs: rec.timeMs,
          videoUrl: rec.videoUrl,
          rawProofUrl: rec.rawProofUrl,
          hz: rec.hz,
          fps: rec.fps,
          device: rec.device,
          comment: rec.comment,
          status: rec.status,
          rejectReason: rec.rejectReason,
          prioritySp: rec.prioritySp ?? 0,
          reviewerId: rec.reviewerId,
          submittedAt: rec.submittedAt ? new Date(rec.submittedAt) : undefined,
          reviewedAt: rec.reviewedAt ? new Date(rec.reviewedAt) : null,
        },
      });
      restored++;
    } catch (e) {
      skipped++;
      console.warn(`Skip record ${rec.id}: ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`Restored ${restored} records, skipped ${skipped} (level not on new list).`);
  return backup.map((r) => r.userId);
}

async function recalculateUsers(userIds) {
  const unique = [...new Set(userIds)];
  console.log(`Recalculating PP for ${unique.length} users...`);
  for (const userId of unique) {
    const userRecords = await prisma.record.findMany({
      where: { userId, status: 'APPROVED' },
      include: { level: true },
    });
    const byLevel = new Map();
    for (const rec of userRecords) {
      const existing = byLevel.get(rec.levelId);
      if (!existing || isRecordBetter(rec, existing, rec.level.mode)) {
        byLevel.set(rec.levelId, rec);
      }
    }
    const deduped = [...byLevel.values()];
    const classicBasePps = deduped
      .filter((r) => r.level.mode === 'CLASSIC' && (r.progress ?? 0) >= r.level.minPercent)
      .map((r) => awardedPpForProgress(r.progress, r.level.minPercent, r.level.basePp))
      .filter((pp) => pp > 0);
    const platformerBasePps = deduped
      .filter((r) => r.level.mode === 'PLATFORMER' && r.timeMs != null)
      .map((r) => r.level.basePp);
    await prisma.user.update({
      where: { id: userId },
      data: {
        classicPp: calculateTotalPp(classicBasePps),
        platformerPp: calculateTotalPp(platformerBasePps),
      },
    });
  }
}

async function importPointercrate() {
  console.log('Fetching Pointercrate (Classic)...');
  let after = 0;
  const allDemons = [];
  while (true) {
    const res = await fetch(`https://pointercrate.com/api/v2/demons/listed?limit=100&after=${after}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) break;
    allDemons.push(...data);
    after = data[data.length - 1].position;
    console.log(`Fetched ${allDemons.length} classic demons...`);
  }

  const rows = [];
  const seen = new Set();
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId || seen.has(gdLevelId)) continue;
    seen.add(gdLevelId);
    const placement = demon.position;
    rows.push({
      gdLevelId,
      name: demon.name,
      creatorName: demon.publisher?.name || 'Unknown',
      verifierName: demon.verifier?.name || null,
      youtubeId: extractYoutubeId(demon.video),
      placement,
      basePp: calculateBasePp(placement),
      minPercent: Number.isFinite(demon.requirement) ? demon.requirement : 100,
      mode: 'CLASSIC',
      difficulty: 'Extreme Demon',
    });
  }

  if (WIPE) {
    const result = await prisma.level.createMany({ data: rows });
    console.log(`Pointercrate createMany=${result.count} (prepared=${rows.length})`);
    return seen;
  }

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await prisma.level.findUnique({ where: { gdLevelId: row.gdLevelId } });
    if (existing) {
      await prisma.level.update({ where: { gdLevelId: row.gdLevelId }, data: row });
      updated++;
    } else {
      await prisma.level.create({ data: row });
      created++;
    }
  }
  console.log(`Pointercrate done. created=${created} updated=${updated}`);
  return seen;
}

async function importPemonlist(classicIds) {
  console.log('Fetching Pemonlist (Platformer)...');
  const res = await fetch('https://pemonlist.com/api/list?limit=1000');
  const data = await res.json();
  const allDemons = data.data || [];
  console.log(`Fetched ${allDemons.length} platformer demons...`);

  const rows = [];
  const seen = new Set();
  let skipped = 0;
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId || seen.has(gdLevelId)) continue;
    if (classicIds.has(gdLevelId)) {
      skipped++;
      console.warn(`Skip pemonlist ${demon.name} (${gdLevelId}): already classic`);
      continue;
    }
    seen.add(gdLevelId);
    const placement = demon.placement;
    rows.push({
      gdLevelId,
      name: demon.name,
      creatorName: demon.creator || 'Unknown',
      verifierName: demon.verifier?.name || null,
      youtubeId: extractYoutubeId(demon.video_id || demon.video),
      placement,
      basePp: calculateBasePp(placement),
      mode: 'PLATFORMER',
      difficulty: 'Extreme Demon',
    });
  }

  if (WIPE || ONLY_PEMON) {
    const result = await prisma.level.createMany({ data: rows, skipDuplicates: true });
    console.log(`Pemonlist createMany=${result.count} skipped=${skipped} (prepared=${rows.length})`);
    return;
  }

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await prisma.level.findUnique({ where: { gdLevelId: row.gdLevelId } });
    if (existing) {
      if (existing.mode === 'CLASSIC') {
        skipped++;
        continue;
      }
      await prisma.level.update({ where: { gdLevelId: row.gdLevelId }, data: row });
      updated++;
    } else {
      await prisma.level.create({ data: row });
      created++;
    }
  }
  console.log(`Pemonlist done. created=${created} updated=${updated} skipped=${skipped}`);
}

async function main() {
  try {
    if (SYNC_REQUIREMENT) {
      await importPointercrate();
      const users = await prisma.user.findMany({
        where: { OR: [{ classicPp: { gt: 0 } }, { records: { some: {} } }] },
        select: { id: true },
      });
      await recalculateUsers(users.map((u) => u.id));
      const sample = await prisma.level.findMany({
        where: { mode: 'CLASSIC', placement: { lte: 3 } },
        orderBy: { placement: 'asc' },
        select: { placement: true, name: true, minPercent: true, basePp: true },
      });
      console.log('sample', sample);
    } else if (RESTORE_ONLY) {
      if (!fs.existsSync(BACKUP_PATH)) {
        throw new Error('No backup at ' + BACKUP_PATH);
      }
      const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
      const userIds = await restoreRecords(backup);
      await recalculateUsers(userIds);
    } else {
      let backup = [];
      if (WIPE) {
        backup = await backupAndWipeLevels();
      }
      let classicIds = new Set();
      if (!ONLY_PEMON) {
        classicIds = await importPointercrate();
      } else {
        const existing = await prisma.level.findMany({
          where: { mode: 'CLASSIC' },
          select: { gdLevelId: true },
        });
        classicIds = new Set(existing.map((l) => l.gdLevelId));
      }
      await importPemonlist(classicIds);
      if (WIPE) {
        const userIds = await restoreRecords(backup);
        const extra = await prisma.user.findMany({
          where: { OR: [{ classicPp: { gt: 0 } }, { platformerPp: { gt: 0 } }] },
          select: { id: true },
        });
        await recalculateUsers([...userIds, ...extra.map((u) => u.id)]);
      } else if (ONLY_PEMON && fs.existsSync(BACKUP_PATH)) {
        const backupFile = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
        const userIds = await restoreRecords(backupFile);
        await recalculateUsers(userIds);
      }
    }
    const classic = await prisma.level.count({ where: { mode: 'CLASSIC' } });
    const plat = await prisma.level.count({ where: { mode: 'PLATFORMER' } });
    const withVideo = await prisma.level.count({ where: { youtubeId: { not: null } } });
    console.log(`Done. classic=${classic} platformer=${plat} withVideo=${withVideo}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
