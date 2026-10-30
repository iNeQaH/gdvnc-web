require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fixing abnormal accumulated activity points ---');

  // 1. Reset hewochat's anomalous 1877 point jump from weeks of unsynced stats
  const hewo = await prisma.user.findFirst({
    where: { username: 'hewochat' },
  });
  if (hewo && hewo.activityPoints > 500) {
    console.log(`Resetting hewochat activity points from ${hewo.activityPoints} to 0.`);
    await prisma.user.update({
      where: { id: hewo.id },
      data: {
        activityPoints: 0,
        activityPrevStars: hewo.gdStars,
        activityPrevMoons: hewo.gdMoons,
        activityPrevDemons: hewo.gdDemons,
      },
    });
  }

  // 2. Fix all users who had activityPrevStars === 0 with huge activity points (from initial unbaselined syncs)
  const anomalous = await prisma.user.findMany({
    where: {
      activityPoints: { gt: 0 },
      activityPrevStars: 0,
      gdStars: { gt: 100 },
    },
  });

  console.log(`Found ${anomalous.length} users with anomalous 0-baseline activity points.`);
  for (const u of anomalous) {
    console.log(`Resetting ${u.username} (points: ${u.activityPoints}, gdStars: ${u.gdStars})`);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        activityPoints: 0,
        activityPrevStars: u.gdStars,
        activityPrevMoons: u.gdMoons,
        activityPrevDemons: u.gdDemons,
      },
    });
  }

  console.log('Finished fixing activity points.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
