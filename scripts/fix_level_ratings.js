require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing level ratings (marking rated demons/ranked levels as RATE)...');
  const res = await prisma.level.updateMany({
    where: {
      ratingType: 'NONE',
      isChallenge: false,
      OR: [
        { difficultyFace: { gte: 10 } },
        { difficulty: { contains: 'Demon', mode: 'insensitive' } },
        { placement: { not: null } },
        { classicRank: { not: null } },
        { vnPlacement: { not: null } },
      ],
    },
    data: {
      ratingType: 'RATE',
    },
  });
  console.log(`Updated ${res.count} levels to RATE.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
