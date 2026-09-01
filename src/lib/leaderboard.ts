import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { pickDecoAndLayoutBadges, cpFromVnLevels } from '@/lib/creatorPoints';
import { calculateModePp, pickHardestLevel } from '@/lib/recordUtils';

export const publicUser = {
  id: true,
  username: true,
  gdUsername: true,
  avatarUrl: true,
  role: true,
  country: true,
  supporterUntil: true,
  gdVerified: true,
} as const;

export function playerDisplayName(player: {
  gdUsername?: string | null;
  username?: string | null;
  displayName?: string | null;
}) {
  return (player.gdUsername || player.displayName || player.username || '').trim();
}

export async function getPlayerLeaderboard(mode: 'CLASSIC' | 'PLATFORMER') {
  const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const ppField = mode === 'PLATFORMER' ? 'platformerPp' : 'classicPp';

  const recordSelect = {
    progress: true,
    timeMs: true,
    submittedAt: true,
    levelId: true,
    level: {
      select: {
        mode: true,
        minPercent: true,
        basePp: true,
        placement: true,
        name: true,
        gdLevelId: true,
        isChallenge: true,
      },
    },
  } as const;

  const [players, orphanRecords, claimedUsers] = await Promise.all([
    prisma.user.findMany({
      where: { [ppField]: { gt: 0 } },
      orderBy: { [ppField]: 'desc' },
      select: {
        ...publicUser,
        classicPp: true,
        platformerPp: true,
        records: {
          where: {
            status: RecordStatus.APPROVED,
            level: { mode: levelMode, isChallenge: false },
          },
          select: recordSelect,
        },
      },
    }),
    prisma.record.findMany({
      where: {
        userId: null,
        status: RecordStatus.APPROVED,
        legacyPlayerName: { not: null },
        level: { mode: levelMode, isChallenge: false },
      },
      select: {
        legacyPlayerName: true,
        ...recordSelect,
      },
    }),
    prisma.user.findMany({
      where: {
        gdUsername: { not: null },
        OR: [{ [ppField]: { gt: 0 } }, { gdVerified: true }],
      },
      select: { gdUsername: true },
    }),
  ]);

  const claimedGd = new Set(
    claimedUsers
      .map((p) => p.gdUsername?.trim().toLowerCase())
      .filter((n): n is string => Boolean(n))
  );

  const byLegacy = new Map<string, typeof orphanRecords>();
  for (const rec of orphanRecords) {
    const key = (rec.legacyPlayerName || '').trim().toLowerCase();
    if (!key || claimedGd.has(key)) continue;
    const list = byLegacy.get(key);
    if (list) list.push(rec);
    else byLegacy.set(key, [rec]);
  }

  const registered = players.map((player) => {
    const { records, ...rest } = player;
    return {
      ...rest,
      displayName: playerDisplayName(player),
      isLegacy: false as const,
      hardestLevel: pickHardestLevel(records),
    };
  });

  const legacy = [];
  for (const [key, recs] of byLegacy) {
    const pp = calculateModePp(recs, levelMode);
    if (pp <= 0) continue;
    const displayName = (recs[0].legacyPlayerName || key).trim();
    legacy.push({
      id: `legacy:${key}`,
      username: null as string | null,
      displayName,
      gdUsername: displayName,
      avatarUrl: null as string | null,
      role: 'USER' as const,
      country: null as string | null,
      supporterUntil: null as Date | null,
      classicPp: mode === 'CLASSIC' ? pp : 0,
      platformerPp: mode === 'PLATFORMER' ? pp : 0,
      isLegacy: true as const,
      hardestLevel: pickHardestLevel(recs),
    });
  }

  return [...registered, ...legacy]
    .filter((p) => (mode === 'PLATFORMER' ? p.platformerPp : p.classicPp) > 0.005)
    .sort((a, b) => {
    const ap = mode === 'PLATFORMER' ? a.platformerPp : a.classicPp;
    const bp = mode === 'PLATFORMER' ? b.platformerPp : b.classicPp;
    return bp - ap;
  });
}

export async function getCreatorLeaderboard() {
  const [creators, vnLevels] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ creatorPoints: { gt: 0 } }, { gdUsername: { not: null } }],
      },
      orderBy: { creatorPoints: 'desc' },
      select: {
        ...publicUser,
        creatorPoints: true,
        createdLevels: {
          where: { isVN: true },
          select: { name: true, difficulty: true, gdLevelId: true, ratingType: true },
          orderBy: [{ vnPlacement: 'asc' }, { name: 'asc' }],
        },
        userBadges: {
          include: {
            badge: { include: { badgeCategory: true } },
          },
        },
      },
    }),
    prisma.level.findMany({
      where: { isVN: true, creatorName: { not: null } },
      select: { creatorName: true, name: true, difficulty: true, gdLevelId: true, ratingType: true },
      orderBy: [{ vnPlacement: 'asc' }, { name: 'asc' }],
    }),
  ]);

  type VnLevel = { name: string; difficulty: string; gdLevelId: number; ratingType: string };
  const levelsByCreator = new Map<string, VnLevel[]>();
  for (const row of vnLevels) {
    const key = (row.creatorName || '').trim().toLowerCase();
    if (!key) continue;
    const list = levelsByCreator.get(key) || [];
    if (!list.some((l) => l.gdLevelId === row.gdLevelId)) {
      list.push({
        name: row.name,
        difficulty: row.difficulty,
        gdLevelId: row.gdLevelId,
        ratingType: row.ratingType,
      });
    }
    levelsByCreator.set(key, list);
  }

  const claimedGd = new Set(
    creators
      .map((c) => c.gdUsername?.trim().toLowerCase())
      .filter((n): n is string => Boolean(n))
  );

  const registered = creators
    .filter((creator) => {
      const gd = creator.gdUsername?.trim().toLowerCase() || '';
      return (creator.creatorPoints || 0) > 0 || (gd && levelsByCreator.has(gd));
    })
    .map((creator) => {
      const { userBadges, createdLevels, ...rest } = creator;
      const gd = creator.gdUsername?.trim().toLowerCase() || '';
      const fromSheet = levelsByCreator.get(gd) || [];
      const byId = new Map<number, VnLevel>();
      for (const lvl of createdLevels) byId.set(lvl.gdLevelId, lvl);
      for (const lvl of fromSheet) if (!byId.has(lvl.gdLevelId)) byId.set(lvl.gdLevelId, lvl);
      const merged = Array.from(byId.values());
      const vnCp = cpFromVnLevels(merged);
      return {
        ...rest,
        creatorPoints: vnCp > 0 ? vnCp : creator.creatorPoints || 0,
        displayName: playerDisplayName(creator),
        isLegacy: false as const,
        unverified: !creator.gdVerified,
        createdLevels: merged,
        qualityBadges: pickDecoAndLayoutBadges(
          userBadges.map((ub) => ({
            ...ub.badge,
            badgeCategory: ub.badge.badgeCategory,
          }))
        ),
      };
    });

  const legacy = [];
  for (const [key, levels] of levelsByCreator) {
    if (!key || claimedGd.has(key)) continue;
    const name = (vnLevels.find((r) => (r.creatorName || '').trim().toLowerCase() === key)?.creatorName || key).trim();
    legacy.push({
      id: `legacy-creator:${key}`,
      username: null as string | null,
      displayName: name,
      gdUsername: name,
      avatarUrl: null as string | null,
      role: 'USER' as const,
      country: null as string | null,
      supporterUntil: null as Date | null,
      gdVerified: false,
      creatorPoints: cpFromVnLevels(levels),
      createdLevels: levels,
      isLegacy: true as const,
      unverified: true,
      qualityBadges: { deco: null, layout: null },
    });
  }

  return [...registered, ...legacy].sort((a, b) => {
    const cp = (b.creatorPoints || 0) - (a.creatorPoints || 0);
    if (cp !== 0) return cp;
    const ln = (b.createdLevels?.length || 0) - (a.createdLevels?.length || 0);
    if (ln !== 0) return ln;
    return String(a.displayName).localeCompare(String(b.displayName), undefined, { sensitivity: 'base' });
  });
}

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; body: unknown }>();

export function getCachedLeaderboard(mode: string) {
  const cached = cache.get(mode);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.body;
  return null;
}

export function setCachedLeaderboard(mode: string, body: unknown) {
  cache.set(mode, { at: Date.now(), body });
}

export function clearLeaderboardCache() {
  cache.clear();
}
