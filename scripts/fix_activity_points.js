require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fixing abnormal accumulated activity points ---');

  // 1. Reset hewochat's anomalous point jump if any
  const hewo = await prisma.user.findFirst({
    where: { username: 'hewochat' },
  });
  if (hewo && hewo.activityPoints > 200) {
    console.log(`Resetting hewochat activity points from ${hewo.activityPoints} to 0.`);
    await prisma.user.update({
      where: { id: hewo.id },
      data: {
        activityPoints: 0,
        activityPrevStars: hewo.gdStars || 0,
        activityPrevMoons: hewo.gdMoons || 0,
        activityPrevDemons: hewo.gdDemons || 0,
      },
    });
  }

  // 2. Fix all users who had abnormal spikes (e.g. from initial unbaselined syncs, new member join + verification)
  const anomalous = await prisma.user.findMany({
    where: {
      activityPoints: { gt: 0 },
      OR: [
        { activityPoints: { gt: 300 } },
        { activityPrevStars: 0, gdStars: { gt: 50 } },
      ],
    },
  });

  console.log(`Found ${anomalous.length} users with anomalous activity points.`);
  for (const u of anomalous) {
    console.log(`Resetting ${u.username} (points: ${u.activityPoints}, gdStars: ${u.gdStars}, activityPrevStars: ${u.activityPrevStars})`);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        activityPoints: 0,
        activityPrevStars: u.gdStars || 0,
        activityPrevMoons: u.gdMoons || 0,
        activityPrevDemons: u.gdDemons || 0,
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
