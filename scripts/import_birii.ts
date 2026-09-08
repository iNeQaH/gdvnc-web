import { PrismaClient, RecordStatus } from '@prisma/client';
import { recalculateUserPp } from '../src/lib/recordUtils';

const prisma = new PrismaClient();

async function importBirii() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: 'birii' }, { gdUsername: 'birii' }] },
  });
  if (!user) throw new Error('User birii not found');

  console.log('Found user birii:', user.id);

  const pRes = await fetch('https://pointercrate.com/api/v1/players/54726/');
  const pJson = await pRes.json();
  const records = pJson.data.records;
  console.log('Found records on Pointercrate:', records.length);

  let insertedCount = 0;
  for (const rec of records) {
    const demonId = rec.demon.id;
    const dRes = await fetch(`https://pointercrate.com/api/v2/demons/${demonId}/`);
    const dJson = await dRes.json();
    const gdLevelId = dJson.data.level_id;

    const dbLevel = await prisma.level.findFirst({
      where: { OR: [{ gdLevelId: gdLevelId }, { name: rec.demon.name }] },
    });

    if (!dbLevel) {
      console.warn('Level not found in DB:', rec.demon.name, gdLevelId);
      continue;
    }

    const existing = await prisma.record.findFirst({
      where: { userId: user.id, levelId: dbLevel.id },
    });

    if (!existing) {
      await prisma.record.create({
        data: {
          userId: user.id,
          levelId: dbLevel.id,
          progress: rec.progress,
          videoUrl: rec.video || 'https://pointercrate.com/demonlist/statsviewer/?player=54726',
          status: RecordStatus.APPROVED,
          reviewedAt: new Date(),
        },
      });
      insertedCount++;
    } else {
      await prisma.record.update({
        where: { id: existing.id },
        data: {
          progress: rec.progress,
          videoUrl: rec.video || existing.videoUrl,
          status: RecordStatus.APPROVED,
          reviewedAt: new Date(),
        },
      });
    }
  }

  console.log(`Processed records, inserted/updated: ${records.length} total (${insertedCount} new)`);
  await recalculateUserPp(user.id);

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('Updated user stats:', {
    username: updatedUser?.username,
    classicPp: updatedUser?.classicPp,
    hardestClassicLevelId: updatedUser?.hardestClassicLevelId,
  });
}

importBirii()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
