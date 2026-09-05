-- Phase 2: hardest-level denorm + leftover indexes (idempotent)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hardestClassicLevelId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hardestPlatformerLevelId" TEXT;

CREATE INDEX IF NOT EXISTS "User_hardestClassicLevelId_idx" ON "User"("hardestClassicLevelId");
CREATE INDEX IF NOT EXISTS "User_hardestPlatformerLevelId_idx" ON "User"("hardestPlatformerLevelId");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "HelpRequest_userId_idx" ON "HelpRequest"("userId");
CREATE INDEX IF NOT EXISTS "HelpRequest_status_idx" ON "HelpRequest"("status");
CREATE INDEX IF NOT EXISTS "HelpRequest_status_createdAt_idx" ON "HelpRequest"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_hardestClassicLevelId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_hardestClassicLevelId_fkey"
      FOREIGN KEY ("hardestClassicLevelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_hardestPlatformerLevelId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_hardestPlatformerLevelId_fkey"
      FOREIGN KEY ("hardestPlatformerLevelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
