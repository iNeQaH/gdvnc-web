import type { PrismaClient } from '@prisma/client';

type ColumnRow = { table_name: string; column_name: string };

async function columnSet(db: PrismaClient) {
  const rows = await db.$queryRaw<ColumnRow[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'User' AND column_name IN ('tokenVersion', 'hardestClassicLevelId', 'hardestPlatformerLevelId'))
        OR (table_name = 'Otp' AND column_name = 'failedAttempts')
      )
  `;
  return new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
}

async function addMissingColumns(db: PrismaClient, have: Set<string>) {
  if (!have.has('User.tokenVersion')) {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0`);
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
}

/** Indexes/FKs — do not block the request that needed the new columns. */
async function addIndexesInBackground(db: PrismaClient) {
  const statements = [
    `CREATE INDEX IF NOT EXISTS "Level_creatorId_idx" ON "Level"("creatorId")`,
    `CREATE INDEX IF NOT EXISTS "Record_reviewerId_idx" ON "Record"("reviewerId")`,
    `CREATE INDEX IF NOT EXISTS "Record_userId_status_idx" ON "Record"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "Record_levelId_status_idx" ON "Record"("levelId", "status")`,
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
 * Adds hotfix/phase-2 columns if Neon is behind Prisma schema.
 * One catalog probe when everything is already there; indexes run in the background.
 */
export async function applyPendingSchema(db: PrismaClient): Promise<void> {
  const have = await columnSet(db);
  const complete =
    have.has('User.tokenVersion') &&
    have.has('Otp.failedAttempts') &&
    have.has('User.hardestClassicLevelId') &&
    have.has('User.hardestPlatformerLevelId');
  if (complete) return;
  await addMissingColumns(db, have);
  void addIndexesInBackground(db);
}
