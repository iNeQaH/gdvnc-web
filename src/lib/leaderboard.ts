import prisma from '@/lib/prisma';
import { LevelMode, RecordStatus } from '@prisma/client';
import { pickDecoAndLayoutBadges, cpFromVnLevels } from '@/lib/creatorPoints';
import { calculateModePp, pickHardestLevel, type HardestLevel } from '@/lib/recordUtils';
import { bustPublicCache, CACHE_TAGS } from '@/lib/publicCache';

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

const hardestLevelSelect = {
  id: true,
  name: true,
  placement: true,
  gdLevelId: true,
} as const;

const recordSelect = {
  progress: true,
  timeMs: true,
  submittedAt: true,
  levelId: true,
  userId: true,
  level: {
    select: {
      id: true,
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

export function playerDisplayName(player: {
  gdUsername?: string | null;
  username?: string | null;
  displayName?: string | null;
}) {
  return (player.gdUsername || player.displayName || player.username || '').trim();
}

function hardestFromLevel(
  level: { id: string; name: string; placement: number | null; gdLevelId: number } | null | undefined
): HardestLevel | null {
  if (!level) return null;
  return {
    id: level.id,
    name: level.name,
    placement: level.placement,
    gdLevelId: level.gdLevelId,
  };
}

async function backfillMissingHardest(
  players: Array<{ id: string; hardestLevel: HardestLevel | null }>,
  mode: 'CLASSIC' | 'PLATFORMER' | 'CHALLENGE'
) {
  const missingIds = players.filter((p) => !p.hardestLevel).map((p) => p.id);
  if (!missingIds.length) return;

  const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const records = await prisma.record.findMany({
    where: {
      userId: { in: missingIds },
      status: RecordStatus.APPROVED,
      level: { 
        mode: mode === 'CHALLENGE' ? undefined : levelMode, 
        isChallenge: mode === 'CHALLENGE' 
      },
    },
    select: recordSelect,
  });

  const byUser = new Map<string, typeof records>();
  for (const rec of records) {
    const uid = rec.userId;
    if (!uid) continue;
    const list = byUser.get(uid) || [];
    list.push(rec);
    byUser.set(uid, list);
  }

  const updates: Array<ReturnType<typeof prisma.user.update>> = [];
  for (const player of players) {
    if (player.hardestLevel) continue;
    const hardest = pickHardestLevel(byUser.get(player.id) || [], mode === 'CHALLENGE' ? 'CHALLENGE' : undefined);
    player.hardestLevel = hardest;
    if (hardest?.id) {
      updates.push(
        prisma.user.update({
          where: { id: player.id },
          data:
            mode === 'PLATFORMER'
              ? { hardestPlatformerLevelId: hardest.id }
              : { hardestClassicLevelId: hardest.id },
        })
      );
    }
  }
  if (updates.length) {
    void Promise.all(updates).catch(() => {});
  }
}

export async function getPlayerLeaderboard(mode: 'CLASSIC' | 'PLATFORMER' | 'CHALLENGE', device: 'ALL' | 'PC' | 'MOBILE' = 'ALL') {
  const levelMode = mode === 'PLATFORMER' ? LevelMode.PLATFORMER : LevelMode.CLASSIC;
  const ppField = mode === 'PLATFORMER' ? 'platformerPp' : mode === 'CHALLENGE' ? 'challengePp' : 'classicPp';

  if (device !== 'ALL') {
    const deviceWhere = device === 'PC' ? { device: 'PC' } : { device: { in: ['Android', 'iOS'] } };
    const userRecords = await prisma.record.findMany({
      where: {
        status: RecordStatus.APPROVED,
        userId: { not: null },
        level: { 
          mode: mode === 'CHALLENGE' ? undefined : levelMode, 
          isChallenge: mode === 'CHALLENGE' 
        },
        ...deviceWhere,
      },
      select: recordSelect,
    });

    const byUser = new Map<string, typeof userRecords>();
    for (const rec of userRecords) {
      if (!rec.userId) continue;
      const list = byUser.get(rec.userId);
      if (list) list.push(rec);
      else byUser.set(rec.userId, [rec]);
    }

    if (byUser.size === 0) return [];

    const userIds = Array.from(byUser.keys());
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        ...publicUser,
        classicPp: true,
        platformerPp: true,
        userBadges: { include: { badge: true } },
      },
    });

    const result = users.map((player) => {
      const recs = byUser.get(player.id) || [];
      const calculatedPp = calculateModePp(recs, mode);
      return {
        id: player.id,
        username: player.username,
        gdUsername: player.gdUsername,
        avatarUrl: player.avatarUrl,
        role: player.role,
        country: player.country,
        supporterUntil: player.supporterUntil,
        gdVerified: player.gdVerified,
        classicPp: mode === 'CLASSIC' ? calculatedPp : player.classicPp,
        platformerPp: mode === 'PLATFORMER' ? calculatedPp : player.platformerPp,
        displayName: playerDisplayName(player),
        isLegacy: false as const,
        hardestLevel: pickHardestLevel(recs, mode === 'CHALLENGE' ? 'CHALLENGE' : undefined),
        topBadges: (() => {
          const roles = [];
          if (player.role === 'ADMIN') {
            roles.push({ id: 'role-admin', name: 'Admin', icon: 'Shield', bgColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', sortOrder: 9999 });
          } else if (player.role === 'MODERATOR') {
            roles.push({ id: 'role-mod', name: 'Moderator', icon: 'ShieldCheck', bgColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', sortOrder: 9998 });
          }
          if (player.supporterUntil && new Date(player.supporterUntil) > new Date()) {
            roles.push({ id: 'role-supporter', name: 'Supporter', icon: 'Heart', bgColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', sortOrder: 9997 });
          }
          return [...(player.userBadges || []).map(ub => ub.badge), ...roles]
            .sort((a, b) => b.sortOrder - a.sortOrder)
            .slice(0, 3);
        })()
      };
    });

    return result
      .filter((p) => (mode === 'PLATFORMER' ? p.platformerPp : p.classicPp) > 0.005)
      .sort((a, b) => {
        const ap = mode === 'PLATFORMER' ? a.platformerPp : a.classicPp;
        const bp = mode === 'PLATFORMER' ? b.platformerPp : b.classicPp;
        return bp - ap;
      });
  }

  const [players, orphanRecords, claimedUsers] = await Promise.all([
    prisma.user.findMany({
      where: { [ppField]: { gt: 0 } },
      orderBy: { [ppField]: 'desc' },
      select: {
        ...publicUser,
        classicPp: true,
        platformerPp: true,
        challengePp: true,
        hardestClassicLevel: { select: hardestLevelSelect },
        hardestPlatformerLevel: { select: hardestLevelSelect },
        hardestChallengeLevel: { select: hardestLevelSelect },
        userBadges: { include: { badge: true } },
      },
    }),
    prisma.record.findMany({
      where: {
        userId: null,
        status: RecordStatus.APPROVED,
        legacyPlayerName: { not: null },
        level: { 
          mode: mode === 'CHALLENGE' ? undefined : levelMode, 
          isChallenge: mode === 'CHALLENGE' 
        },
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
    const stored =
      mode === 'PLATFORMER' 
        ? player.hardestPlatformerLevel 
        : mode === 'CHALLENGE'
          ? player.hardestChallengeLevel
          : player.hardestClassicLevel;
    return {
      id: player.id,
      username: player.username,
      gdUsername: player.gdUsername,
      avatarUrl: player.avatarUrl,
      role: player.role,
      country: player.country,
      supporterUntil: player.supporterUntil,
      gdVerified: player.gdVerified,
      classicPp: player.classicPp,
      platformerPp: player.platformerPp,
      challengePp: player.challengePp,
      displayName: playerDisplayName(player),
      isLegacy: false as const,
      hardestLevel: hardestFromLevel(stored),
      topBadges: (() => {
        const roles = [];
        if (player.role === 'ADMIN') {
          roles.push({ id: 'role-admin', name: 'Admin', icon: 'Shield', bgColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', sortOrder: 9999 });
        } else if (player.role === 'MODERATOR') {
          roles.push({ id: 'role-mod', name: 'Moderator', icon: 'ShieldCheck', bgColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', sortOrder: 9998 });
        }
        if (player.supporterUntil && new Date(player.supporterUntil) > new Date()) {
          roles.push({ id: 'role-supporter', name: 'Supporter', icon: 'Heart', bgColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', sortOrder: 9997 });
        }
        return [...(player.userBadges || []).map(ub => ub.badge), ...roles]
          .sort((a, b) => b.sortOrder - a.sortOrder)
          .slice(0, 3);
      })()
    };
  });

  await backfillMissingHardest(registered, mode);

  const legacy = [];
  for (const [key, recs] of byLegacy) {
    const pp = calculateModePp(recs, mode);
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
      challengePp: mode === 'CHALLENGE' ? pp : 0,
      isLegacy: true as const,
      hardestLevel: pickHardestLevel(recs, mode === 'CHALLENGE' ? 'CHALLENGE' : undefined),
    });
  }

  return [...registered, ...legacy]
    .filter((p) => (mode === 'PLATFORMER' ? p.platformerPp : mode === 'CHALLENGE' ? p.challengePp : p.classicPp) > 0.005)
    .sort((a, b) => {
      const ap = mode === 'PLATFORMER' ? a.platformerPp : mode === 'CHALLENGE' ? a.challengePp : a.classicPp;
      const bp = mode === 'PLATFORMER' ? b.platformerPp : mode === 'CHALLENGE' ? b.challengePp : b.classicPp;
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
        userBadges: {
          include: {
            badge: { include: { badgeCategory: true } },
          },
        },
      },
    }),
    prisma.level.findMany({
      where: { isVN: true },
      select: {
        creatorId: true,
        creatorName: true,
        name: true,
        difficulty: true,
        gdLevelId: true,
        ratingType: true,
      },
      orderBy: [{ vnPlacement: 'asc' }, { name: 'asc' }],
    }),
  ]);

  type VnLevel = { name: string; difficulty: string; gdLevelId: number; ratingType: string };
  const levelsByCreatorId = new Map<string, VnLevel[]>();
  const levelsByCreatorName = new Map<string, VnLevel[]>();
  const pushLevel = (map: Map<string, VnLevel[]>, key: string, lvl: VnLevel) => {
    if (!key) return;
    const list = map.get(key) || [];
    if (!list.some((l) => l.gdLevelId === lvl.gdLevelId)) list.push(lvl);
    map.set(key, list);
  };

  for (const row of vnLevels) {
    const lvl: VnLevel = {
      name: row.name,
      difficulty: row.difficulty,
      gdLevelId: row.gdLevelId,
      ratingType: row.ratingType,
    };
    if (row.creatorId) pushLevel(levelsByCreatorId, row.creatorId, lvl);
    const nameKey = (row.creatorName || '').trim().toLowerCase();
    if (nameKey) pushLevel(levelsByCreatorName, nameKey, lvl);
  }

  const claimedGd = new Set(
    creators
      .map((c) => c.gdUsername?.trim().toLowerCase())
      .filter((n): n is string => Boolean(n))
  );

  const registered = creators
    .filter((creator) => {
      const gd = creator.gdUsername?.trim().toLowerCase() || '';
      return (creator.creatorPoints || 0) > 0 || (gd && levelsByCreatorName.has(gd)) || levelsByCreatorId.has(creator.id);
    })
    .map((creator) => {
      const { userBadges, ...rest } = creator;
      const gd = creator.gdUsername?.trim().toLowerCase() || '';
      const byId = new Map<number, VnLevel>();
      for (const lvl of levelsByCreatorId.get(creator.id) || []) byId.set(lvl.gdLevelId, lvl);
      for (const lvl of levelsByCreatorName.get(gd) || []) if (!byId.has(lvl.gdLevelId)) byId.set(lvl.gdLevelId, lvl);
      const merged = Array.from(byId.values());
      return {
        ...rest,
        creatorPoints: creator.creatorPoints || 0,
        displayName: playerDisplayName(creator),
        isLegacy: false as const,
        unverified: !creator.gdVerified,
        createdLevels: merged,
        topBadges: (() => {
          const roles = [];
          if (creator.role === 'ADMIN') {
            roles.push({ id: 'role-admin', name: 'Admin', icon: 'Shield', bgColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', sortOrder: 9999 });
          } else if (creator.role === 'MODERATOR') {
            roles.push({ id: 'role-mod', name: 'Moderator', icon: 'ShieldCheck', bgColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', sortOrder: 9998 });
          }
          if (creator.supporterUntil && new Date(creator.supporterUntil) > new Date()) {
            roles.push({ id: 'role-supporter', name: 'Supporter', icon: 'Heart', bgColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', sortOrder: 9997 });
          }
          return [...(userBadges || []).map(ub => ub.badge), ...roles]
            .sort((a, b) => b.sortOrder - a.sortOrder)
            .slice(0, 3);
        })(),
        qualityBadges: pickDecoAndLayoutBadges(
          userBadges.map((ub) => ({
            ...ub.badge,
            badgeCategory: ub.badge.badgeCategory,
          }))
        ),
      };
    });

  const legacy = [];
  for (const [key, levels] of levelsByCreatorName) {
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

export function clearLeaderboardCache() {
  bustPublicCache(CACHE_TAGS.leaderboard, CACHE_TAGS.highlights);
}
