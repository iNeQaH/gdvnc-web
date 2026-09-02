import type { PrismaClient } from '@prisma/client';

const STATEMENTS = [
  `ALTER TABLE "Level" ADD COLUMN IF NOT EXISTS "vnPlacement" INTEGER`,
  `CREATE INDEX IF NOT EXISTS "Level_vnPlacement_idx" ON "Level"("vnPlacement")`,
  `CREATE INDEX IF NOT EXISTS "Level_isVN_idx" ON "Level"("isVN")`,
  `ALTER TABLE "LevelSubmission" ADD COLUMN IF NOT EXISTS "vnPlacement" INTEGER`,
  `ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "imageScale" DOUBLE PRECISION DEFAULT 1`,
] as const;

let ready: Promise<void> | null = null;

/** Apply pending list-schema patches (idempotent). Neon is not migrated on Vercel build. */
export function ensureDbSchema(client: PrismaClient): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const sql of STATEMENTS) {
        await client.$executeRawUnsafe(sql);
      }
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
