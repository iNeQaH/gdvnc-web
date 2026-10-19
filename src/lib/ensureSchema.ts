import type { PrismaClient } from '@prisma/client';

type ColumnRow = { table_name: string; column_name: string };

async function columnSet(db: PrismaClient) {
  const rows = await db.$queryRaw<ColumnRow[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'User' AND column_name IN ('tokenVersion', 'hardestClassicLevelId', 'hardestPlatformerLevelId', 'isBanned', 'bannedUntil', 'banReason', 'failedLoginAttempts', 'lockedUntil', 'lastFailedLoginAt'))
        OR (table_name = 'Otp' AND column_name = 'failedAttempts')
        OR (table_name = 'PageVisit' AND column_name = 'id')
        OR (table_name = 'ListChangeLog' AND column_name = 'id')
        OR (table_name = 'Level' AND column_name = 'classicRank')
        OR (table_name = 'RedeemCode' AND column_name IN ('id', 'expiresAt', 'rewardType', 'days', 'spAmount'))
        OR (table_name = 'RedeemCodeUse' AND column_name IN ('id', 'rewardType', 'days', 'spAmount'))
        OR (table_name = 'UserSpGrant' AND column_name = 'id')
        OR (table_name = 'User' AND column_name IN ('nameColor', 'nameGradient', 'nameGlow', 'nameFont', 'hasGlitchTheme', 'easterEggCompleted', 'easterEggPoints', 'easterEggSpins', 'easterEggLastSlot', 'easterEggDailyCount', 'easterEggDailyDate'))
        OR (table_name = 'Clan' AND column_name = 'id')
        OR (table_name = 'ClanMember' AND column_name = 'id')
        OR (table_name = 'ClanJoinRequest' AND column_name = 'id')
        OR (table_name = 'ClanSpContribution' AND column_name = 'id')
        OR (table_name = 'ClanBan' AND column_name = 'id')
      )
  `;
  return new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
}

async function addMissingColumns(db: PrismaClient, have: Set<string>) {
  if (!have.has('User.tokenVersion')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.isBanned')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false`);
  }
  if (!have.has('User.bannedUntil')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3)`);
  }
  if (!have.has('User.banReason')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`);
  }
  if (!have.has('User.failedLoginAttempts')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.lockedUntil')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3)`);
  }
  if (!have.has('User.lastFailedLoginAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP(3)`);
  }
  if (!have.has('Otp.failedAttempts')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Otp" ADD COLUMN IF NOT EXISTS "failedAttempts" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.hardestClassicLevelId')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hardestClassicLevelId" TEXT`);
  }
  if (!have.has('User.hardestPlatformerLevelId')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hardestPlatformerLevelId" TEXT`);
  }
  if (!have.has('PageVisit.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PageVisit" (
        "id" TEXT NOT NULL,
        "path" TEXT NOT NULL,
        "ipHash" TEXT NOT NULL,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
      )
    `);
  }
  if (!have.has('ListChangeLog.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ListChangeLog" (
        "id" TEXT NOT NULL,
        "list" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "gdLevelId" INTEGER NOT NULL,
        "levelName" TEXT NOT NULL,
        "oldPlacement" INTEGER,
        "newPlacement" INTEGER,
        "aboveLevelName" TEXT,
        "belowLevelName" TEXT,
        "pushedOutLevelName" TEXT,
        "causedByLevelName" TEXT,
        "causedByPlacement" INTEGER,
        "oldRating" TEXT,
        "newRating" TEXT,
        "details" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ListChangeLog_pkey" PRIMARY KEY ("id")
      )
    `);
  }
  if (!have.has('Level.classicRank')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Level" ADD COLUMN IF NOT EXISTS "classicRank" INTEGER`);
  }
  if (!have.has('RedeemCode.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RedeemCode" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "months" INTEGER NOT NULL,
        "maxUses" INTEGER NOT NULL DEFAULT 1,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdById" TEXT,
        CONSTRAINT "RedeemCode_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "RedeemCode_code_key" UNIQUE ("code")
      )
    `);
  } else if (!have.has('RedeemCode.expiresAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`);
  }
  await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ALTER COLUMN "maxUses" DROP NOT NULL`).catch(() => {});
  if (!have.has('RedeemCode.rewardType')) {
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ADD COLUMN IF NOT EXISTS "rewardType" TEXT NOT NULL DEFAULT 'SUPPORTER_DAYS'`);
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ADD COLUMN IF NOT EXISTS "days" INTEGER NOT NULL DEFAULT 30`);
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ADD COLUMN IF NOT EXISTS "spAmount" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('RedeemCodeUse.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RedeemCodeUse" (
        "id" TEXT NOT NULL,
        "codeId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "months" INTEGER NOT NULL,
        "rewardType" TEXT NOT NULL DEFAULT 'SUPPORTER_DAYS',
        "days" INTEGER NOT NULL DEFAULT 0,
        "spAmount" INTEGER NOT NULL DEFAULT 0,
        "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RedeemCodeUse_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "RedeemCodeUse_codeId_userId_key" UNIQUE ("codeId", "userId")
      )
    `);
  } else if (!have.has('RedeemCodeUse.rewardType')) {
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCodeUse" ADD COLUMN IF NOT EXISTS "rewardType" TEXT NOT NULL DEFAULT 'SUPPORTER_DAYS'`);
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCodeUse" ADD COLUMN IF NOT EXISTS "days" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCodeUse" ADD COLUMN IF NOT EXISTS "spAmount" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('UserSpGrant.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSpGrant" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "reason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserSpGrant_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserSpGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }
  if (!have.has('User.nameColor')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameColor" TEXT`);
  }
  if (!have.has('User.nameGradient')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameGradient" TEXT`);
  }
  if (!have.has('User.nameGlow')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameGlow" TEXT`);
  }
  if (!have.has('User.nameFont')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameFont" TEXT`);
  }
  if (!have.has('User.hasGlitchTheme')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasGlitchTheme" BOOLEAN NOT NULL DEFAULT false`);
  }
  if (!have.has('User.easterEggCompleted')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggCompleted" BOOLEAN NOT NULL DEFAULT false`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggPoints" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggSpins" INTEGER NOT NULL DEFAULT 3`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggLastSlot" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggDailyCount" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggDailyDate" TEXT`);
  }
  if (!have.has('Clan.id')) {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanRole') THEN
          CREATE TYPE "ClanRole" AS ENUM ('LEADER', 'MODERATOR', 'MEMBER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanRequestStatus') THEN
          CREATE TYPE "ClanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$;
    `).catch(() => {});
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Clan" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "tag" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "avatarUrl" TEXT,
        "coverUrl" TEXT,
        "videoUrl" TEXT,
        "favoriteLevelId" TEXT,
        "color" TEXT NOT NULL DEFAULT '#0ea5e9',
        "colorGradient" TEXT,
        "themeColor" TEXT,
        "themeGradient" TEXT,
        "isSuspended" BOOLEAN NOT NULL DEFAULT false,
        "gracePeriodUntil" TIMESTAMP(3),
        "leaderId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Clan_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Clan_name_key" UNIQUE ("name"),
        CONSTRAINT "Clan_tag_key" UNIQUE ("tag"),
        CONSTRAINT "Clan_slug_key" UNIQUE ("slug")
      )
    `);
  }
  if (!have.has('ClanMember.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClanMember" (
        "id" TEXT NOT NULL,
        "clanId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ClanMember_userId_key" UNIQUE ("userId")
      )
    `);
  }
  if (!have.has('ClanJoinRequest.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClanJoinRequest" (
        "id" TEXT NOT NULL,
        "clanId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "message" TEXT,
        "status" "ClanRequestStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClanJoinRequest_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ClanJoinRequest_clanId_userId_key" UNIQUE ("clanId", "userId")
      )
    `);
  }
  if (!have.has('ClanSpContribution.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClanSpContribution" (
        "id" TEXT NOT NULL,
        "clanId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "spPledged" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClanSpContribution_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ClanSpContribution_userId_key" UNIQUE ("userId")
      )
    `);
  }
  if (!have.has('ClanBan.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClanBan" (
        "id" TEXT NOT NULL,
        "clanId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "reason" TEXT,
        "bannedById" TEXT,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClanBan_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ClanBan_clanId_userId_key" UNIQUE ("clanId", "userId")
      )
    `);
  }
}

/** Indexes/FKs — do not block the request that needed the new columns. */
async function addIndexesInBackground(db: PrismaClient) {
  const statements = [
    `CREATE INDEX IF NOT EXISTS "ClanBan_clanId_idx" ON "ClanBan"("clanId")`,
    `CREATE INDEX IF NOT EXISTS "ClanBan_userId_idx" ON "ClanBan"("userId")`,
    `CREATE INDEX IF NOT EXISTS "ClanBan_expiresAt_idx" ON "ClanBan"("expiresAt")`,
    `CREATE INDEX IF NOT EXISTS "Level_creatorId_idx" ON "Level"("creatorId")`,
    `CREATE INDEX IF NOT EXISTS "Record_reviewerId_idx" ON "Record"("reviewerId")`,
    `CREATE INDEX IF NOT EXISTS "Record_userId_status_idx" ON "Record"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "Record_levelId_status_idx" ON "Record"("levelId", "status")`,
    `CREATE INDEX IF NOT EXISTS "Record_status_prioritySp_submittedAt_idx" ON "Record"("status", "prioritySp" DESC, "submittedAt" ASC)`,
    `CREATE INDEX IF NOT EXISTS "CreatorWork_reviewerId_idx" ON "CreatorWork"("reviewerId")`,
    `CREATE INDEX IF NOT EXISTS "CreatorWork_userId_status_idx" ON "CreatorWork"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "LevelSubmission_reviewerId_idx" ON "LevelSubmission"("reviewerId")`,
    `CREATE INDEX IF NOT EXISTS "LevelSubmission_userId_status_idx" ON "LevelSubmission"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "User_username_lower_idx" ON "User" (LOWER("username"))`,
    `CREATE INDEX IF NOT EXISTS "User_email_lower_idx" ON "User" (LOWER("email"))`,
    `CREATE INDEX IF NOT EXISTS "User_hardestClassicLevelId_idx" ON "User"("hardestClassicLevelId")`,
    `CREATE INDEX IF NOT EXISTS "User_hardestPlatformerLevelId_idx" ON "User"("hardestPlatformerLevelId")`,
    `CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead")`,
    `CREATE INDEX IF NOT EXISTS "HelpRequest_userId_idx" ON "HelpRequest"("userId")`,
    `CREATE INDEX IF NOT EXISTS "HelpRequest_status_idx" ON "HelpRequest"("status")`,
    `CREATE INDEX IF NOT EXISTS "HelpRequest_status_createdAt_idx" ON "HelpRequest"("status", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId")`,
    `CREATE INDEX IF NOT EXISTS "SiteAnnouncement_authorId_idx" ON "SiteAnnouncement"("authorId")`,
    `CREATE INDEX IF NOT EXISTS "Level_mode_isChallenge_placement_idx" ON "Level"("mode", "isChallenge", "placement")`,
    `CREATE INDEX IF NOT EXISTS "Level_isVN_isChallenge_vnPlacement_idx" ON "Level"("isVN", "isChallenge", "vnPlacement")`,
    `CREATE INDEX IF NOT EXISTS "Level_classicRank_idx" ON "Level"("classicRank")`,
    `CREATE INDEX IF NOT EXISTS "PageVisit_createdAt_idx" ON "PageVisit"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "PageVisit_path_idx" ON "PageVisit"("path")`,
    `CREATE INDEX IF NOT EXISTS "PageVisit_ipHash_idx" ON "PageVisit"("ipHash")`,
    `CREATE INDEX IF NOT EXISTS "ListChangeLog_list_createdAt_idx" ON "ListChangeLog"("list", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "ListChangeLog_list_idx" ON "ListChangeLog"("list")`,
    `CREATE INDEX IF NOT EXISTS "ListChangeLog_gdLevelId_idx" ON "ListChangeLog"("gdLevelId")`,
    `CREATE INDEX IF NOT EXISTS "ListChangeLog_eventType_idx" ON "ListChangeLog"("eventType")`,
    `CREATE INDEX IF NOT EXISTS "RedeemCode_code_idx" ON "RedeemCode"("code")`,
    `CREATE INDEX IF NOT EXISTS "RedeemCode_isActive_idx" ON "RedeemCode"("isActive")`,
    `CREATE INDEX IF NOT EXISTS "RedeemCode_expiresAt_idx" ON "RedeemCode"("expiresAt")`,
    `CREATE INDEX IF NOT EXISTS "RedeemCodeUse_userId_idx" ON "RedeemCodeUse"("userId")`,
    `CREATE INDEX IF NOT EXISTS "RedeemCodeUse_codeId_idx" ON "RedeemCodeUse"("codeId")`,
    `CREATE INDEX IF NOT EXISTS "UserSpGrant_userId_idx" ON "UserSpGrant"("userId")`,
    `CREATE INDEX IF NOT EXISTS "UserSpGrant_expiresAt_idx" ON "UserSpGrant"("expiresAt")`,
    `UPDATE "UserSpGrant" g
     SET "expiresAt" = u."supporterUntil"
     FROM "User" u
     WHERE g."userId" = u.id
       AND u."supporterUntil" IS NOT NULL
       AND u."supporterUntil" > g."expiresAt"`,
    `DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SiteAnnouncement_authorId_fkey'
      ) THEN
        ALTER TABLE "SiteAnnouncement" DROP CONSTRAINT "SiteAnnouncement_authorId_fkey";
      END IF;
      ALTER TABLE "SiteAnnouncement" ALTER COLUMN "authorId" DROP NOT NULL;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SiteAnnouncement_authorId_fkey'
      ) THEN
        ALTER TABLE "SiteAnnouncement"
          ADD CONSTRAINT "SiteAnnouncement_authorId_fkey"
          FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_hardestClassicLevelId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_hardestClassicLevelId_fkey"
          FOREIGN KEY ("hardestClassicLevelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_hardestPlatformerLevelId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_hardestPlatformerLevelId_fkey"
          FOREIGN KEY ("hardestPlatformerLevelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$`,
  ];
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (error) {
      console.error('ensureSchema index', error);
    }
  }
}

/**
 * Adds hotfix/phase-2 columns if Neon/local DB is behind Prisma schema.
 * One catalog probe when everything is already there; indexes run in the background.
 */
export async function applyPendingSchema(db: PrismaClient): Promise<void> {
  const have = await columnSet(db);
  const complete =
    have.has('User.tokenVersion') &&
    have.has('User.isBanned') &&
    have.has('User.bannedUntil') &&
    have.has('Otp.failedAttempts') &&
    have.has('User.hardestClassicLevelId') &&
    have.has('User.hardestPlatformerLevelId') &&
    have.has('PageVisit.id') &&
    have.has('ListChangeLog.id') &&
    have.has('Level.classicRank') &&
    have.has('RedeemCode.id') &&
    have.has('RedeemCode.expiresAt') &&
    have.has('RedeemCode.rewardType') &&
    have.has('RedeemCodeUse.id') &&
    have.has('UserSpGrant.id') &&
    have.has('Clan.id') &&
    have.has('ClanMember.id') &&
    have.has('ClanJoinRequest.id') &&
    have.has('ClanSpContribution.id') &&
    have.has('ClanBan.id') &&
    have.has('User.nameColor') &&
    have.has('User.hasGlitchTheme') &&
    have.has('User.easterEggCompleted');
  if (complete) return;
  await addMissingColumns(db, have);
  void addIndexesInBackground(db);
}
