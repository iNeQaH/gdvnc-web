import { LevelMode } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { ExternalListLevel } from '@/lib/externalLists';
import fs from 'fs';
import path from 'path';
import { getUserDataDir } from '@/lib/localStorage';

const SITE_KEY = (mode: 'CLASSIC' | 'PLATFORMER') => `list-snapshot:${mode}`;

type SnapshotMeta = { url: string; key: string; savedAt: string; count: number };

type SnapshotFile = {
  version: 1;
  mode: 'CLASSIC' | 'PLATFORMER';
  savedAt: string;
  levels: ExternalListLevel[];
};

function parseMeta(html: string): SnapshotMeta | null {
  try {
    const data = JSON.parse(html) as SnapshotMeta;
    if (!data?.url || !data?.key) return null;
    return data;
  } catch {
    return null;
  }
}

function rowToExternal(
  row: {
    gdLevelId: number;
    name: string;
    placement: number | null;
    creatorName: string | null;
    verifierName: string | null;
    youtubeId: string | null;
    minPercent: number;
    mode: LevelMode;
    description: string | null;
  },
  mode: 'CLASSIC' | 'PLATFORMER'
): ExternalListLevel | null {
  if (row.placement == null || row.placement < 1) return null;
  return {
    gdLevelId: row.gdLevelId,
    name: row.name,
    placement: row.placement,
    creatorName: row.creatorName,
    verifierName: row.verifierName,
    youtubeId: row.youtubeId,
    minPercent: row.minPercent,
    mode,
    description: row.description,
  };
}

/** Dump the local ranked list to local storage (backup). */
export async function persistLocalListSnapshot(mode: 'CLASSIC' | 'PLATFORMER'): Promise<SnapshotMeta | null> {
  const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const rows = await prisma.level.findMany({
    where: { mode: levelMode, isChallenge: false, placement: { not: null } },
    select: {
      gdLevelId: true,
      name: true,
      placement: true,
      creatorName: true,
      verifierName: true,
      youtubeId: true,
      minPercent: true,
      mode: true,
      description: true,
    },
    orderBy: { placement: 'asc' },
  });

  const levels = rows
    .map((row) => rowToExternal(row, mode))
    .filter((row): row is ExternalListLevel => Boolean(row));

  const savedAt = new Date().toISOString();
  const payload: SnapshotFile = { version: 1, mode, savedAt, levels };
  const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
  
  const filename = `gdvn-${mode.toLowerCase()}-list.json`;
  const snapshotPath = path.join(getUserDataDir(), 'snapshots', filename);
  await fs.promises.mkdir(path.dirname(snapshotPath), { recursive: true }).catch(() => {});
  await fs.promises.writeFile(snapshotPath, buffer);

  const meta: SnapshotMeta = {
    url: `/api/uploads/snapshots/${filename}`,
    key: `snapshots/${filename}`,
    savedAt,
    count: levels.length,
  };

  await prisma.siteContent.upsert({
    where: { key: SITE_KEY(mode) },
    create: { key: SITE_KEY(mode), html: JSON.stringify(meta) },
    update: { html: JSON.stringify(meta) },
  });

  return meta;
}

export async function loadListSnapshot(mode: 'CLASSIC' | 'PLATFORMER'): Promise<ExternalListLevel[] | null> {
  const row = await prisma.siteContent.findUnique({ where: { key: SITE_KEY(mode) } });
  const meta = row ? parseMeta(row.html) : null;
  if (!meta?.key) return null;

  try {
    const snapshotPath = path.join(getUserDataDir(), meta.key);
    const content = await fs.promises.readFile(snapshotPath, 'utf8');
    const data = JSON.parse(content) as SnapshotFile;
    if (!Array.isArray(data?.levels) || data.levels.length === 0) return null;
    return data.levels.filter(
      (l) => Number.isFinite(l.gdLevelId) && l.gdLevelId > 0 && Number.isFinite(l.placement) && l.placement >= 1
    );
  } catch (error: any) {
    // Fallback if the path is an external URL (legacy UploadThing URL)
    if (meta.url.startsWith('http')) {
      try {
        const res = await fetch(meta.url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as SnapshotFile;
        if (!Array.isArray(data?.levels) || data.levels.length === 0) return null;
        return data.levels.filter(
          (l) => Number.isFinite(l.gdLevelId) && l.gdLevelId > 0 && Number.isFinite(l.placement) && l.placement >= 1
        );
      } catch (fallbackError) {
        console.error(`Failed to load legacy ${mode} list snapshot via fetch`, fallbackError);
      }
    } else {
      console.error(`Failed to load ${mode} list snapshot from disk`, error);
    }
    return null;
  }
}
