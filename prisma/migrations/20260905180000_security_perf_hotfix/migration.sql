-- Security / performance hotfix (idempotent)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Otp" ADD COLUMN IF NOT EXISTS "failedAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Level_creatorId_idx" ON "Level"("creatorId");
CREATE INDEX IF NOT EXISTS "Record_reviewerId_idx" ON "Record"("reviewerId");
CREATE INDEX IF NOT EXISTS "Record_userId_status_idx" ON "Record"("userId", "status");
CREATE INDEX IF NOT EXISTS "Record_levelId_status_idx" ON "Record"("levelId", "status");
CREATE INDEX IF NOT EXISTS "CreatorWork_reviewerId_idx" ON "CreatorWork"("reviewerId");
CREATE INDEX IF NOT EXISTS "CreatorWork_userId_status_idx" ON "CreatorWork"("userId", "status");
CREATE INDEX IF NOT EXISTS "LevelSubmission_reviewerId_idx" ON "LevelSubmission"("reviewerId");
CREATE INDEX IF NOT EXISTS "LevelSubmission_userId_status_idx" ON "LevelSubmission"("userId", "status");
CREATE INDEX IF NOT EXISTS "User_username_lower_idx" ON "User" (LOWER("username"));
CREATE INDEX IF NOT EXISTS "User_email_lower_idx" ON "User" (LOWER("email"));
