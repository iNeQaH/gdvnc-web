require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LIST_SIZE = 1000;
const MAX_PP = 400;
const MIN_PP = 20;
const BASE_PP_EXP_K = Math.log(MAX_PP / MIN_PP) / (LIST_SIZE - 1);

function calculateBasePp(placement) {
  if (placement == null || placement < 1) return 0;
  if (placement > LIST_SIZE) return MIN_PP;
  const pp = MIN_PP * Math.exp(BASE_PP_EXP_K * (LIST_SIZE - placement));
  return Number(pp.toFixed(2));
}

const DESIRED_ORDER = [
  'UFokinWoTNyanCat III',
  '367',
  'First Fractal',
  'happy chamber',
  'Dare',
  'Deception Chamber',
  'FASTIDIUM',
  'Notscapes',
  'Yotsugi',
  'UFokinWoTNyanCat II',
  'Bliss',
  'Neorum',
  'Degragation',
  'Future',
  'Meorum',
  'LongHawkter Chall ii',
  'Chamber of Dom',
  'triple t easy',
  'Ritual',
  'lucent',
  'ez 4 tralalero',
  'The Ultimate Epilogu',
  'I Stole This',
  'blah',
  'Ielts band 7',
];

async function main() {
  console.log('--- Fixing Challenge List Ranks & Resolving Duplicates ---');

  const levels = await prisma.level.findMany({
    where: {
      isChallenge: true,
      placement: { not: null },
    },
    select: {
      id: true,
      name: true,
      placement: true,
      difficultyFace: true,
      basePp: true,
      createdAt: true,
    },
  });

  levels.sort((a, b) => {
    const idxA = DESIRED_ORDER.indexOf(a.name);
    const idxB = DESIRED_ORDER.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    if ((a.placement || 999) !== (b.placement || 999)) {
      return (a.placement || 999) - (b.placement || 999);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  console.log(`Found ${levels.length} ranked challenge levels.`);

  let updatedCount = 0;
  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    const newRank = i + 1;
    const correctPp = calculateBasePp(newRank);

    if (lvl.placement !== newRank || Math.abs((lvl.basePp || 0) - correctPp) > 0.01) {
      console.log(`Updating #${newRank}: "${lvl.name}" (old rank: ${lvl.placement}, old pp: ${lvl.basePp} -> new pp: ${correctPp})`);
      await prisma.level.update({
        where: { id: lvl.id },
        data: {
          placement: newRank,
          basePp: correctPp,
        },
      });
      updatedCount++;
    } else {
      console.log(`Unchanged #${newRank}: "${lvl.name}" (${correctPp} pts)`);
    }
  }

  console.log(`Successfully normalized ${updatedCount} challenge levels.`);
}

main()
  .catch((e) => {
    console.error('Error fixing challenge ranks:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
