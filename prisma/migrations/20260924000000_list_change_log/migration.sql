-- CreateTable
CREATE TABLE IF NOT EXISTS "ListChangeLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
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
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListChangeLog_list_createdAt_idx" ON "ListChangeLog"("list", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ListChangeLog_list_idx" ON "ListChangeLog"("list");
CREATE INDEX IF NOT EXISTS "ListChangeLog_gdLevelId_idx" ON "ListChangeLog"("gdLevelId");
CREATE INDEX IF NOT EXISTS "ListChangeLog_eventType_idx" ON "ListChangeLog"("eventType");
