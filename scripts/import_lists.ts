const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAX_PP = 2500;
const MIN_PP = 10;
const LIST_SIZE = 150;

function calculateBasePp(placement: number): number {
  if (placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;
  const k = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);
  const pp = MIN_PP * Math.exp(k * (LIST_SIZE - placement));
  return Number(pp.toFixed(2));
}

function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const ytMatch = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return ytMatch ? ytMatch[1] : null;
}

async function importPointercrate() {
  console.log('Fetching Pointercrate (Classic)...');
  let after = 0;
  const allDemons: any[] = [];
  while (true) {
    const res = await fetch(`https://pointercrate.com/api/v2/demons/listed/?limit=100&after=${after}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'GDVNC/1.0 (+https://gdvnc-web.vercel.app)' },
    });
    const data = await res.json();
    if (!data.length) break;
    allDemons.push(...data);
    after = data[data.length - 1].position;
    console.log(`Fetched ${allDemons.length} classic demons...`);
  }

  console.log('Importing classic demons (server PP, keep existing placements)...');
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId) continue;
    const youtubeId = extractYoutubeId(demon.video);
    const existing = await prisma.level.findUnique({ where: { gdLevelId } });

    if (existing) {
      const placement = existing.placement;
      await prisma.level.update({
        where: { gdLevelId },
        data: {
          name: demon.name,
          creatorName: demon.publisher?.name || existing.creatorName,
          youtubeId: youtubeId || existing.youtubeId,
          difficulty: existing.difficulty || 'Extreme Demon',
          basePp: placement ? calculateBasePp(placement) : existing.basePp,
        },
      });
    } else {
      const placement = demon.position;
      await prisma.level.create({
        data: {
          gdLevelId,
          placement,
          basePp: calculateBasePp(placement),
          name: demon.name,
          creatorName: demon.publisher?.name || 'Unknown',
          youtubeId,
          mode: 'CLASSIC',
          difficulty: 'Extreme Demon',
        },
      });
    }
  }
  console.log('Pointercrate import complete!');
}

async function importPemonlist() {
  console.log('Fetching Pemonlist (Platformer)...');
  const res = await fetch('https://pemonlist.com/api/list');
  const data = await res.json();
  const allDemons = data.data || [];
  console.log(`Fetched ${allDemons.length} platformer demons...`);

  console.log('Importing platformer demons (server PP, keep existing placements)...');
  for (const demon of allDemons) {
    const gdLevelId = demon.level_id;
    if (!gdLevelId) continue;
    const existing = await prisma.level.findUnique({ where: { gdLevelId } });

    if (existing) {
      const placement = existing.placement;
      await prisma.level.update({
        where: { gdLevelId },
        data: {
          name: demon.name,
          creatorName: demon.creator || existing.creatorName,
          basePp: placement ? calculateBasePp(placement) : existing.basePp,
        },
      });
    } else {
      const placement = demon.placement;
      await prisma.level.create({
        data: {
          gdLevelId,
          placement,
          basePp: calculateBasePp(placement),
          name: demon.name,
          creatorName: demon.creator || 'Unknown',
          mode: 'PLATFORMER',
          difficulty: 'Extreme Demon',
        },
      });
    }
  }
  console.log('Pemonlist import complete!');
}

async function recalcAllServerPp() {
  console.log('Recalculating all ranked levels with server formula...');
  const ranked = await prisma.level.findMany({
    where: { placement: { not: null } },
    select: { id: true, placement: true, basePp: true },
  });
  let updated = 0;
  for (const lvl of ranked) {
    const correctPp = calculateBasePp(lvl.placement!);
    if (Math.abs(correctPp - lvl.basePp) > 0.01) {
      await prisma.level.update({
        where: { id: lvl.id },
        data: { basePp: correctPp },
      });
      updated++;
    }
  }
  console.log(`Updated ${updated}/${ranked.length} level scores to server PP.`);
}

async function main() {
  try {
    await importPointercrate();
    await importPemonlist();
    await recalcAllServerPp();
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
