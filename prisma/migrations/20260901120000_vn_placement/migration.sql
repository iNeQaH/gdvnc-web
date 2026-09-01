ALTER TABLE "Level" ADD COLUMN IF NOT EXISTS "vnPlacement" INTEGER;
CREATE INDEX IF NOT EXISTS "Level_vnPlacement_idx" ON "Level"("vnPlacement");
CREATE INDEX IF NOT EXISTS "Level_isVN_idx" ON "Level"("isVN");
ALTER TABLE "LevelSubmission" ADD COLUMN IF NOT EXISTS "vnPlacement" INTEGER;
