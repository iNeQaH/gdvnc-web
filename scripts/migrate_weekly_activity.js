require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getVnWeekString(nowMs = Date.now()) {
  const vnMs = nowMs + 7 * 3600_000;
  const d = new Date(vnMs);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function main() {
  const currentWeek = getVnWeekString();
  console.log('--- Migrating Activity Points to Weekly format (' + currentWeek + ') ---');

  // Chuyển toàn bộ user có activityDate cũ sang format tuần nếu là hôm nay
  const todayVn = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const updatedToday = await prisma.user.updateMany({
    where: { activityDate: todayVn },
    data: { activityDate: currentWeek }
  });
  console.log(`Updated ${updatedToday.count} users from today's date to ${currentWeek}`);

  // Những ai có activityDate cũ khác format tuần và khác hôm nay, reset baseline sạch
  const oldUsers = await prisma.user.findMany({
    where: {
      activityDate: {
        not: null,
        notIn: [currentWeek]
      }
    }
  });

  console.log(`Found ${oldUsers.length} users with old activity dates.`);
  for (const u of oldUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        activityPoints: 0,
        activityDate: currentWeek,
        activityPrevStars: u.gdStars || 0,
        activityPrevMoons: u.gdMoons || 0,
        activityPrevDemons: u.gdDemons || 0,
      }
    });
  }

  console.log('Migration to weekly activity points finished.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
