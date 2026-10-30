import type { PrismaClient } from '@prisma/client';

type ColumnRow = { table_name: string; column_name: string };

async function columnSet(db: PrismaClient) {
  const rows = await db.$queryRaw<ColumnRow[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'User' AND column_name IN ('tokenVersion', 'hardestClassicLevelId', 'hardestPlatformerLevelId', 'isBanned', 'bannedUntil', 'banReason', 'failedLoginAttempts', 'lockedUntil', 'lastFailedLoginAt', 'lastLoginAt', 'displayName', 'gdStars', 'gdMoons', 'gdDemons', 'gdHasGlobalRank', 'gdStatsUpdatedAt', 'likedUserIds', 'displayedBadgeIds', 'hideAllBadges', 'activityPoints', 'activityDate', 'activityPrevStars', 'activityPrevMoons', 'activityPrevDemons'))
        OR (table_name = 'Otp' AND column_name = 'failedAttempts')
        OR (table_name = 'PageVisit' AND column_name = 'id')
        OR (table_name = 'ListChangeLog' AND column_name = 'id')
        OR (table_name = 'Level' AND column_name = 'classicRank')
        OR (table_name = 'RedeemCode' AND column_name IN ('id', 'expiresAt', 'rewardType', 'days', 'spAmount'))
        OR (table_name = 'RedeemCodeUse' AND column_name IN ('id', 'rewardType', 'days', 'spAmount'))
        OR (table_name = 'UserSpGrant' AND column_name = 'id')
        OR (table_name = 'User' AND column_name IN ('nameColor', 'nameGradient', 'nameGlow', 'nameFont', 'hasGlitchTheme', 'easterEggCompleted', 'easterEggPoints', 'easterEggCode', 'easterEggSpins', 'easterEggLastSlot', 'easterEggDailyCount', 'easterEggDailyDate'))
        OR (table_name = 'Clan' AND column_name = 'id')
        OR (table_name = 'ClanMember' AND column_name = 'id')
        OR (table_name = 'ClanJoinRequest' AND column_name = 'id')
        OR (table_name = 'ClanSpContribution' AND column_name = 'id')
        OR (table_name = 'ClanBan' AND column_name = 'id')
        OR (table_name = 'Badge' AND column_name IN ('systemKey', 'color2', 'effect'))
        OR (table_name = 'SiteAnnouncement' AND column_name IN ('expiresAt', 'likedUserIds', 'poll'))
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
  if (!have.has('User.lastLoginAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`);
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
  if (!have.has('User.easterEggCode')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "easterEggCode" TEXT`);
    try {
      await db.$executeRawUnsafe(`
        UPDATE "User" u
        SET "easterEggCode" = r.code
        FROM "RedeemCode" r
        WHERE r."createdById" = u.id
          AND r."rewardType" = 'GLITCH_THEME'
          AND u."easterEggCode" IS NULL
      `);
    } catch {}
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
  if (!have.has('User.displayName')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT`);
  }
  if (!have.has('User.gdStars')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gdStars" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.gdMoons')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gdMoons" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.gdDemons')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gdDemons" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.gdHasGlobalRank')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gdHasGlobalRank" BOOLEAN NOT NULL DEFAULT true`);
  }
  if (!have.has('User.gdStatsUpdatedAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gdStatsUpdatedAt" TIMESTAMP(3)`);
  }
  if (!have.has('User.likedUserIds')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "likedUserIds" TEXT[] NOT NULL DEFAULT '{}'`);
  }
  // Turn off glow for badges with no effect (effect = 'none' or empty)
  try {
    await db.$executeRawUnsafe(`UPDATE "Badge" SET "glowColor" = NULL WHERE "effect" = 'none' OR "effect" IS NULL OR "effect" = ''`);
  } catch {}
  if (!have.has('User.activityPoints')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityPoints" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.activityDate')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityDate" TEXT`);
  }
  if (!have.has('User.activityPrevStars')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityPrevStars" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.activityPrevMoons')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityPrevMoons" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.activityPrevDemons')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityPrevDemons" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.displayedBadgeIds')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayedBadgeIds" TEXT[] NOT NULL DEFAULT '{}'`);
  }
  if (!have.has('User.hideAllBadges')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideAllBadges" BOOLEAN NOT NULL DEFAULT false`);
  }
  if (!have.has('Badge.systemKey')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "systemKey" TEXT`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Badge_systemKey_key" ON "Badge"("systemKey")`);
  }
  if (!have.has('Badge.color2')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "color2" TEXT`);
  }
  if (!have.has('Badge.effect')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "effect" TEXT`);
  }
  if (!have.has('SiteAnnouncement.expiresAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "SiteAnnouncement" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`);
  }
  if (!have.has('SiteAnnouncement.likedUserIds')) {
    await db.$executeRawUnsafe(`ALTER TABLE "SiteAnnouncement" ADD COLUMN IF NOT EXISTS "likedUserIds" TEXT[] NOT NULL DEFAULT '{}'`);
  }
  if (!have.has('SiteAnnouncement.poll')) {
    await db.$executeRawUnsafe(`ALTER TABLE "SiteAnnouncement" ADD COLUMN IF NOT EXISTS "poll" JSONB`);
  }
  if (!have.has('User.ownedThemes')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ownedThemes" TEXT[] NOT NULL DEFAULT '{}'`);
  }
  if (!have.has('User.hideSupporterPublic')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideSupporterPublic" BOOLEAN NOT NULL DEFAULT false`);
  }
  if (!have.has('User.supporterTotalMonths')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supporterTotalMonths" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.supporterTotalAmount')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supporterTotalAmount" INTEGER NOT NULL DEFAULT 0`);
  }
  if (!have.has('User.lastSupportedAt')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSupportedAt" TIMESTAMP(3)`);
  }
  if (!have.has('RedeemCode.rewardTheme')) {
    await db.$executeRawUnsafe(`ALTER TABLE "RedeemCode" ADD COLUMN IF NOT EXISTS "rewardTheme" TEXT`);
  }
  if (!have.has('Clan.socialLinks')) {
    await db.$executeRawUnsafe(`ALTER TABLE "Clan" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB`);
  }
  if (!have.has('HomePost.id')) {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HomePost" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "linkUrl" TEXT,
        "levelGdId" TEXT,
        "videoUrl" TEXT,
        "poll" JSONB,
        "isPinned" BOOLEAN NOT NULL DEFAULT false,
        "authorId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3),
        CONSTRAINT "HomePost_pkey" PRIMARY KEY ("id")
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
    `CREATE INDEX IF NOT EXISTS "HomePost_createdAt_idx" ON "HomePost"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "HomePost_isPinned_idx" ON "HomePost"("isPinned")`,
    `CREATE INDEX IF NOT EXISTS "HomePost_authorId_idx" ON "HomePost"("authorId")`,
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
    `CREATE INDEX IF NOT EXISTS "User_gdStars_idx" ON "User"("gdStars" DESC)`,
    `CREATE INDEX IF NOT EXISTS "User_gdMoons_idx" ON "User"("gdMoons" DESC)`,
    `CREATE INDEX IF NOT EXISTS "User_gdDemons_idx" ON "User"("gdDemons" DESC)`,
    `CREATE INDEX IF NOT EXISTS "Badge_systemKey_idx" ON "Badge"("systemKey")`,
    `CREATE INDEX IF NOT EXISTS "SiteAnnouncement_expiresAt_idx" ON "SiteAnnouncement"("expiresAt")`,
  ];
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (error) {
      console.error('ensureSchema index', error);
    }
  }
}

export const DEFAULT_SYSTEM_ROLES = [
  {
    systemKey: 'ROLE_ADMIN',
    name: 'Admin',
    description: 'Quản trị viên hệ thống GDVN',
    icon: 'crown',
    color: '#ef4444',
    bgColor: '#ef444420',
    borderColor: '#ef444450',
    glowColor: '#ef4444',
    effect: 'glow',
    category: 'STAFF',
    sortOrder: 1000,
  },
  {
    systemKey: 'ROLE_MODERATOR',
    name: 'Moderator',
    description: 'Kiểm duyệt viên hệ thống GDVN',
    icon: 'shield',
    color: '#3b82f6',
    bgColor: '#3b82f620',
    borderColor: '#3b82f650',
    glowColor: '#3b82f6',
    effect: 'glow',
    category: 'STAFF',
    sortOrder: 900,
  },
  {
    systemKey: 'ROLE_SUPPORTER',
    name: 'Supporter',
    description: 'Người ủng hộ phát triển GDVN',
    icon: 'heart',
    color: '#ec4899',
    color2: '#f43f5e',
    bgColor: '#ec489920',
    borderColor: '#ec489950',
    glowColor: '#ec4899',
    effect: 'gradient',
    category: 'SUPPORTER',
    sortOrder: 800,
  },
  {
    systemKey: 'CREATOR_MYTHIC',
    name: 'Mythic Creator',
    description: 'Tác giả có màn chơi đạt phẩm chất Mythic',
    icon: 'diamond',
    color: '#06b6d4',
    color2: '#3b82f6',
    bgColor: '#06b6d420',
    borderColor: '#06b6d450',
    glowColor: '#06b6d4',
    effect: 'shimmer',
    category: 'CREATOR',
    sortOrder: 750,
  },
  {
    systemKey: 'CREATOR_LEGENDARY',
    name: 'Legendary Creator',
    description: 'Tác giả có màn chơi đạt phẩm chất Legendary',
    icon: 'trophy',
    color: '#f59e0b',
    color2: '#ef4444',
    bgColor: '#f59e0b20',
    borderColor: '#f59e0b50',
    glowColor: '#f59e0b',
    effect: 'gradient',
    category: 'CREATOR',
    sortOrder: 700,
  },
  {
    systemKey: 'CREATOR_EPIC',
    name: 'Epic Creator',
    description: 'Tác giả có màn chơi đạt phẩm chất Epic',
    icon: 'sparkles',
    color: '#8b5cf6',
    color2: '#d946ef',
    bgColor: '#8b5cf620',
    borderColor: '#8b5cf650',
    glowColor: '#8b5cf6',
    effect: 'glow',
    category: 'CREATOR',
    sortOrder: 650,
  },
  {
    systemKey: 'CREATOR_FEATURED',
    name: 'Featured Creator',
    description: 'Tác giả có màn chơi đạt phẩm chất Featured',
    icon: 'star',
    color: '#eab308',
    bgColor: '#eab30820',
    borderColor: '#eab30850',
    glowColor: '#eab308',
    effect: 'none',
    category: 'CREATOR',
    sortOrder: 600,
  },
  {
    systemKey: 'CREATOR_STAR',
    name: 'Rated Creator',
    description: 'Tác giả có màn chơi được Star Rate',
    icon: 'award',
    color: '#10b981',
    bgColor: '#10b98120',
    borderColor: '#10b98150',
    glowColor: '#10b981',
    effect: 'none',
    category: 'CREATOR',
    sortOrder: 550,
  },
  {
    systemKey: 'GRINDER_DEMON',
    name: 'Demon Slayer',
    description: 'Chinh phục từ 500 Demons trở lên trong Geometry Dash',
    icon: 'flame',
    color: '#dc2626',
    color2: '#991b1b',
    bgColor: '#dc262620',
    borderColor: '#dc262650',
    glowColor: '#dc2626',
    effect: 'gradient',
    category: 'PLAYER',
    sortOrder: 500,
  },
  {
    systemKey: 'GRINDER_STAR',
    name: 'Star Grinder',
    description: 'Thu thập từ 10,000 Stars trở lên trong Geometry Dash',
    icon: 'star',
    color: '#facc15',
    color2: '#eab308',
    bgColor: '#facc1520',
    borderColor: '#facc1550',
    glowColor: '#facc15',
    effect: 'glow',
    category: 'PLAYER',
    sortOrder: 450,
  },
  {
    systemKey: 'GRINDER_MOON',
    name: 'Moon Grinder',
    description: 'Thu thập từ 5,000 Moons trở lên trong Geometry Dash',
    icon: 'moon',
    color: '#38bdf8',
    color2: '#0284c7',
    bgColor: '#38bdf820',
    borderColor: '#38bdf850',
    glowColor: '#38bdf8',
    effect: 'glow',
    category: 'PLAYER',
    sortOrder: 400,
  },
];

export async function seedSystemBadges(db: PrismaClient): Promise<void> {
  try {
    for (const b of DEFAULT_SYSTEM_ROLES) {
      await db.badge.upsert({
        where: { systemKey: b.systemKey },
        update: {},
        create: {
          systemKey: b.systemKey,
          name: b.name,
          description: b.description,
          icon: b.icon,
          color: b.color,
          color2: b.color2,
          bgColor: b.bgColor,
          borderColor: b.borderColor,
          glowColor: b.glowColor,
          effect: b.effect,
          category: b.category,
          sortOrder: b.sortOrder,
        },
      });
    }
  } catch (err) {
    console.error('seedSystemBadges error', err);
  }
}

/**
 * Adds hotfix/phase-2 columns if Neon/local DB is behind Prisma schema.
 * One catalog probe when everything is already there; indexes run in the background.
 */
export const REQUIRED_SCHEMA_KEYS = [
  'User.tokenVersion',
  'User.isBanned',
  'User.bannedUntil',
  'User.failedLoginAttempts',
  'User.lockedUntil',
  'User.lastFailedLoginAt',
  'User.lastLoginAt',
  'Otp.failedAttempts',
  'User.hardestClassicLevelId',
  'User.hardestPlatformerLevelId',
  'PageVisit.id',
  'ListChangeLog.id',
  'Level.classicRank',
  'RedeemCode.id',
  'RedeemCode.expiresAt',
  'RedeemCode.rewardType',
  'RedeemCodeUse.id',
  'UserSpGrant.id',
  'Clan.id',
  'ClanMember.id',
  'ClanJoinRequest.id',
  'ClanSpContribution.id',
  'ClanBan.id',
  'User.nameColor',
  'User.hasGlitchTheme',
  'User.easterEggCompleted',
  'User.easterEggCode',
  'User.displayName',
  'User.gdStars',
  'User.gdMoons',
  'User.gdDemons',
  'User.gdHasGlobalRank',
  'User.gdStatsUpdatedAt',
  'User.likedUserIds',
  'User.displayedBadgeIds',
  'User.hideAllBadges',
  'User.activityPoints',
  'User.activityDate',
  'User.activityPrevStars',
  'User.activityPrevMoons',
  'User.activityPrevDemons',
  'Badge.systemKey',
  'Badge.color2',
  'Badge.effect',
  'SiteAnnouncement.expiresAt',
  'SiteAnnouncement.likedUserIds',
  'SiteAnnouncement.poll',
  'User.ownedThemes',
  'User.hideSupporterPublic',
  'User.supporterTotalMonths',
  'User.supporterTotalAmount',
  'User.lastSupportedAt',
  'RedeemCode.rewardTheme',
  'Clan.socialLinks',
  'HomePost.id',
];

export async function applyPendingSchema(db: PrismaClient): Promise<void> {
  const have = await columnSet(db);
  const complete = REQUIRED_SCHEMA_KEYS.every((key) => have.has(key));
  if (complete) return;
  await addMissingColumns(db, have);
  void addIndexesInBackground(db);
  void seedSystemBadges(db);
}
