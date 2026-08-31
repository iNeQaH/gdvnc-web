ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "TimelineEvent_sourceKey_key" ON "TimelineEvent"("sourceKey");
