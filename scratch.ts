import { PrismaClient } from '@prisma/client';
import { recalculateAllUsersPp } from './src/lib/recordUtils';

const prisma = new PrismaClient();

async function main() {
  console.log('Recalculating PP...');
  const count = await recalculateAllUsersPp();
  console.log(`Recalculated PP for ${count} users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());