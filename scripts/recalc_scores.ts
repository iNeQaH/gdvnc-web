import { refreshAllLevelBasePp } from '../src/lib/upsertLevel';
import { recalculateAllUsersPp } from '../src/lib/recordUtils';
import prisma from '../src/lib/prisma';

async function main() {
  const levels = await refreshAllLevelBasePp();
  const users = await recalculateAllUsersPp();
  console.log(`Updated ${levels} level basePp values and recalculated ${users} players.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
