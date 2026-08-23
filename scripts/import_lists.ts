const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateBasePp } = require('../src/lib/ScoringEngine');

async function importPointercrate() {
  console.log('Fetching Pointercrate (Classic)...');
  let after = 0;
  let allDemons = [];
  while (true) {
    const res = await fetch(`https://pointercrate.com/api/v2/demons/listed?limit=100&after=${after}`);
    const data = await res.json();
    if (!data.length) break;
    allDemons.push(...data);
    after = data[data.length - 1].position;
    console.log(`Fetched ${allDemons.length} classic demons...`);
  }

  console.log('Importing into database...');
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId) continue;
    const placement = demon.position;
    const basePp = calculateBasePp(placement);
    
    await prisma.level.upsert({
      where: { gdLevelId },
      update: {
        placement,
        basePp,
        name: demon.name,
        creatorName: demon.publisher.name,
        videoUrl: demon.video,
        mode: 'CLASSIC'
      },
      create: {
        gdLevelId,
        placement,
        basePp,
        name: demon.name,
        creatorName: demon.publisher.name,
        videoUrl: demon.video,
        mode: 'CLASSIC',
        difficulty: 'Extreme Demon'
      }
    });
  }
  console.log('Pointercrate import complete!');
}

async function importPemonlist() {
  console.log('Fetching Pemonlist (Platformer)...');
  const res = await fetch('https://pemonlist.com/api/list');
  const data = await res.json();
  const allDemons = data.data || [];
  console.log(`Fetched ${allDemons.length} platformer demons...`);

  console.log('Importing into database...');
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId) continue;
    const placement = demon.placement;
    const basePp = calculateBasePp(placement);
    
    await prisma.level.upsert({
      where: { gdLevelId },
      update: {
        placement,
        basePp,
        name: demon.name,
        creatorName: demon.creator,
        mode: 'PLATFORMER'
      },
      create: {
        gdLevelId,
        placement,
        basePp,
        name: demon.name,
        creatorName: demon.creator,
        mode: 'PLATFORMER',
        difficulty: 'Extreme Demon'
      }
    });
  }
  console.log('Pemonlist import complete!');
}

async function main() {
  try {
    await importPointercrate();
    await importPemonlist();
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
