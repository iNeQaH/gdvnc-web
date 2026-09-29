/**
 * Migration script: Populate classicRank for existing Classic List levels.
 * 
 * Classic List = Classic mode, non-challenge, Extreme Demon (difficultyFace >= 14),
 * with at least one approved record.
 * 
 * Ranks are assigned by sorting: placement ASC (nulls last), difficultyFace DESC, name ASC
 * 
 * Run with: node scripts/populate-classic-ranks.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add column if not exists
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Level" ADD COLUMN IF NOT EXISTS "classicRank" INTEGER`
    );
    console.log('✅ classicRank column ensured');
  } catch (e) {
    console.log('Column already exists or error:', e.message);
  }

  // Find all Classic List eligible levels
  // Classic List = Classic mode, non-challenge, Extreme Demon+, with approved records
  const levels = await prisma.level.findMany({
    where: {
      mode: 'CLASSIC',
      isChallenge: false,
      difficultyFace: { gte: 14 },
      records: { some: { status: 'APPROVED' } },
    },
    select: {
      id: true,
      name: true,
      placement: true,
      difficultyFace: true,
      classicRank: true,
    },
    orderBy: [
      { placement: { sort: 'asc', nulls: 'last' } },
      { difficultyFace: 'desc' },
      { name: 'asc' },
    ],
  });

  console.log(`Found ${levels.length} eligible Classic List levels`);

  // Assign contiguous ranks
  for (let i = 0; i < levels.length; i++) {
    const rank = i + 1;
    const lvl = levels[i];
    if (lvl.classicRank !== rank) {
      await prisma.level.update({
        where: { id: lvl.id },
        data: { classicRank: rank },
      });
      console.log(`  #${rank}: ${lvl.name} (placement=${lvl.placement}, face=${lvl.difficultyFace}) ${lvl.classicRank ? `was #${lvl.classicRank}` : 'NEW'}`);
    } else {
      console.log(`  #${rank}: ${lvl.name} (unchanged)`);
    }
  }

  // Clear classicRank for non-eligible levels that somehow have one
  const cleared = await prisma.level.updateMany({
    where: {
      classicRank: { not: null },
      OR: [
        { mode: { not: 'CLASSIC' } },
        { isChallenge: true },
        { difficultyFace: { lt: 14 } },
      ],
    },
    data: { classicRank: null },
  });
  if (cleared.count > 0) {
    console.log(`Cleared classicRank from ${cleared.count} ineligible levels`);
  }

  console.log(`\n✅ Done! ${levels.length} levels ranked in Classic List.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
