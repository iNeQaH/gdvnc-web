import { PrismaClient, LevelMode, Role, RecordStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Exponential PP Formula for reference
function calcBasePp(placement: number): number {
  if (placement < 1) return 0;
  if (placement > 150) return 10.0;
  const MAX_PP = 2500;
  const MIN_PP = 10;
  const k = Math.log(MAX_PP / MIN_PP) / 149;
  const pp = MIN_PP * Math.exp(k * (150 - placement));
  return Number(pp.toFixed(2));
}

function calcTotalPp(basePps: number[]): number {
  if (!basePps.length) return 0;
  const sorted = [...basePps].sort((a, b) => b - a);
  return Number(sorted.reduce((acc, pp, i) => acc + pp * Math.pow(0.95, i), 0).toFixed(2));
}

async function main() {
  console.log('Seeding GDVN Database...');

  // 1. Create Admin Account: iNeQaH
  const adminPasswordHash = await bcrypt.hash('Honkaiimpact3rd!', 10);
  const userPasswordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'iNeQaH' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      bio: 'Administrator of GDVN. Passionate extreme demon slayer & level architect.',
      discordTag: 'iNeQaH#0001',
      gdUsername: 'iNeQaH',
      country: 'Vietnam',
    },
    create: {
      username: 'iNeQaH',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      bio: 'Administrator of GDVN. Passionate extreme demon slayer & level architect.',
      discordTag: 'iNeQaH#0001',
      gdUsername: 'iNeQaH',
      country: 'Vietnam',
      classicPp: 0,
      platformerPp: 0,
      creatorPoints: 240,
    },
  });

  console.log('Created/Updated Admin:', admin.username);

  // 2. Create Community Players
  const playersData = [
    { username: 'HungProGD', bio: 'Top 1 VN Demon Grinder. Dedicated 240Hz player.', discordTag: 'HungGD#1234', gdUsername: 'HungPro', country: 'Vietnam', creatorPoints: 50 },
    { username: 'VNDasher99', bio: 'Platformer speedrun specialist and wave master.', discordTag: 'VNDasher#9999', gdUsername: 'VNDasher', country: 'Vietnam', creatorPoints: 120 },
    { username: 'CyberK', bio: 'Extreme Demon Verifier & Gameplay Creator.', discordTag: 'CyberK#5555', gdUsername: 'CyberK_VN', country: 'Vietnam', creatorPoints: 310 },
    { username: 'AeroVN', bio: 'Ship & Precision control enthusiast.', discordTag: 'AeroVN#7777', gdUsername: 'AeroGD', country: 'Vietnam', creatorPoints: 15 },
    { username: 'DinhPhuc', bio: 'Chasing the top 10 national leaderboard.', discordTag: 'PhucGD#8888', gdUsername: 'DinhPhuc', country: 'Vietnam', creatorPoints: 0 },
  ];

  const players: Record<string, any> = {};
  for (const p of playersData) {
    players[p.username] = await prisma.user.upsert({
      where: { username: p.username },
      update: { passwordHash: userPasswordHash, ...p },
      create: { ...p, passwordHash: userPasswordHash, classicPp: 0, platformerPp: 0 },
    });
  }

  // 3. Create Classic Demonlist Levels
  const classicLevelsData = [
    { gdLevelId: 95598687, name: 'Tidal Wave', placement: 1, difficulty: 'Extreme Demon', creatorName: 'Onilink', verifierName: 'Zoink', youtubeId: '54b3874P5c8', description: 'Top 1 Extreme Demon. The undisputed peak of difficulty in Geometry Dash.' },
    { gdLevelId: 91823901, name: 'Avernus', placement: 2, difficulty: 'Extreme Demon', creatorName: 'P持', verifierName: 'Diamond', youtubeId: 'gT2Xb8a0-6o', description: 'Legendary fixed-hitbox extreme demon.' },
    { gdLevelId: 82434450, name: 'Acheron', placement: 3, difficulty: 'Extreme Demon', creatorName: 'Ryamu', verifierName: 'Zoink', youtubeId: 'H58vH0lYV1o', description: 'Tartarus successor with relentless wave and ship sections.' },
    { gdLevelId: 78564321, name: 'Silent Clubstep', placement: 4, difficulty: 'Extreme Demon', creatorName: 'Sailent', verifierName: 'Paqter', youtubeId: '2bX9Jd3M8xY', description: 'The historic impossible demon brought to legitimate completion.' },
    { gdLevelId: 74581290, name: 'Slaughterhouse', placement: 5, difficulty: 'Extreme Demon', creatorName: 'Icedcave', verifierName: 'Doggie', youtubeId: 'dQw4w9WgXcQ', description: 'Terrifying 60fps wave corridors and intense atmosphere.' },
    { gdLevelId: 76543210, name: 'Abyss of Darkness', placement: 6, difficulty: 'Extreme Demon', creatorName: 'Exen', verifierName: 'Cursed', youtubeId: 'dQw4w9WgXcQ', description: 'Complex timings and brutal memory transitions.' },
    { gdLevelId: 58943210, name: 'Tartarus', placement: 10, difficulty: 'Extreme Demon', creatorName: 'Riot', verifierName: 'Dolphy', youtubeId: 'dQw4w9WgXcQ', description: 'Historic benchmark of high-tier Extreme Demons.' },
    { gdLevelId: 10565740, name: 'Bloodbath', placement: 85, difficulty: 'Extreme Demon', creatorName: 'Riot', verifierName: 'Riot', youtubeId: 'dQw4w9WgXcQ', description: 'The most iconic Extreme Demon in Geometry Dash history.' },
    { gdLevelId: 3958201, name: 'Cataclysm', placement: 130, difficulty: 'Extreme Demon', creatorName: 'Ggb0y', verifierName: 'Ggb0y', youtubeId: 'dQw4w9WgXcQ', description: 'The original gateway Extreme Demon.' },
    { gdLevelId: 44290123, name: 'Sonic Wave', placement: 45, difficulty: 'Extreme Demon', creatorName: 'Cyclic', verifierName: 'Sunix', youtubeId: 'dQw4w9WgXcQ', description: 'The ultimate nine-circles trial.' },
  ];

  const classicLevels: Record<string, any> = {};
  for (const l of classicLevelsData) {
    const basePp = calcBasePp(l.placement);
    classicLevels[l.name] = await prisma.level.upsert({
      where: { gdLevelId: l.gdLevelId },
      update: { ...l, mode: LevelMode.CLASSIC, basePp },
      create: { ...l, mode: LevelMode.CLASSIC, basePp },
    });
  }

  // 4. Create Platformer Levels
  const platformerLevelsData = [
    { gdLevelId: 10101010, name: 'Robot King', placement: 1, difficulty: 'Extreme Demon', creatorName: 'ShiftVN', verifierName: 'Speedy', youtubeId: 'dQw4w9WgXcQ', description: 'Insane platformer precision with micro-jumps and tight timer.' },
    { gdLevelId: 10202020, name: 'Tower of Rage', placement: 2, difficulty: 'Extreme Demon', creatorName: 'GlitchMaster', verifierName: 'VNDasher99', youtubeId: 'dQw4w9WgXcQ', description: 'Vertical speedrun tower with unforgiving gravity traps.' },
    { gdLevelId: 10303030, name: 'I Wanna Defeat The Four Horsemen', placement: 3, difficulty: 'Extreme Demon', creatorName: 'KaizoVN', verifierName: 'KaizoVN', youtubeId: 'dQw4w9WgXcQ', description: 'Precision needle spikes and multi-phase boss fight.' },
    { gdLevelId: 10404040, name: 'Jetpack Trial', placement: 4, difficulty: 'Insane Demon', creatorName: 'FlyGuy', verifierName: 'HungProGD', youtubeId: 'dQw4w9WgXcQ', description: 'Physics-based platformer fuel management and tight tunnels.' },
    { gdLevelId: 10505050, name: 'Shipwrecked Cove', placement: 5, difficulty: 'Hard Demon', creatorName: 'CyberK', verifierName: 'CyberK', youtubeId: 'dQw4w9WgXcQ', description: 'Atmospheric puzzle adventure platformer with secret routes.' },
  ];

  const platformerLevels: Record<string, any> = {};
  for (const l of platformerLevelsData) {
    const basePp = calcBasePp(l.placement);
    platformerLevels[l.name] = await prisma.level.upsert({
      where: { gdLevelId: l.gdLevelId },
      update: { ...l, mode: LevelMode.PLATFORMER, basePp },
      create: { ...l, mode: LevelMode.PLATFORMER, basePp },
    });
  }

  // 5. Clean up old records for idempotent seeding
  await prisma.record.deleteMany({});

  // 6. Seed Approved Records
  const recordsData = [
    // HungProGD records
    { user: 'HungProGD', level: 'Tidal Wave', progress: 100, videoUrl: 'https://youtu.be/mock1', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Acheron', progress: 100, videoUrl: 'https://youtu.be/mock2', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Slaughterhouse', progress: 100, videoUrl: 'https://youtu.be/mock3', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Sonic Wave', progress: 100, videoUrl: 'https://youtu.be/mock4', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Bloodbath', progress: 100, videoUrl: 'https://youtu.be/mock5', hz: 144, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // iNeQaH records
    { user: 'iNeQaH', level: 'Avernus', progress: 100, videoUrl: 'https://youtu.be/mock6', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'iNeQaH', level: 'Silent Clubstep', progress: 100, videoUrl: 'https://youtu.be/mock7', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'iNeQaH', level: 'Tartarus', progress: 100, videoUrl: 'https://youtu.be/mock8', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'iNeQaH', level: 'Cataclysm', progress: 100, videoUrl: 'https://youtu.be/mock9', hz: 144, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // VNDasher99 records
    { user: 'VNDasher99', level: 'Tartarus', progress: 100, videoUrl: 'https://youtu.be/mock10', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'VNDasher99', level: 'Sonic Wave', progress: 100, videoUrl: 'https://youtu.be/mock11', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'VNDasher99', level: 'Bloodbath', progress: 100, videoUrl: 'https://youtu.be/mock12', hz: 144, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // CyberK records
    { user: 'CyberK', level: 'Slaughterhouse', progress: 100, videoUrl: 'https://youtu.be/mock13', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'CyberK', level: 'Abyss of Darkness', progress: 100, videoUrl: 'https://youtu.be/mock14', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // AeroVN records
    { user: 'AeroVN', level: 'Bloodbath', progress: 100, videoUrl: 'https://youtu.be/mock15', hz: 144, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'AeroVN', level: 'Cataclysm', progress: 100, videoUrl: 'https://youtu.be/mock16', hz: 144, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // Platformer records (Time in ms)
    { user: 'VNDasher99', level: 'Robot King', timeMs: 145230, videoUrl: 'https://youtu.be/plat1', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'VNDasher99', level: 'Tower of Rage', timeMs: 98400, videoUrl: 'https://youtu.be/plat2', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Tower of Rage', timeMs: 104200, videoUrl: 'https://youtu.be/plat3', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'HungProGD', level: 'Jetpack Trial', timeMs: 62150, videoUrl: 'https://youtu.be/plat4', hz: 360, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },
    { user: 'iNeQaH', level: 'I Wanna Defeat The Four Horsemen', timeMs: 312000, videoUrl: 'https://youtu.be/plat5', hz: 240, device: 'PC', status: RecordStatus.APPROVED, reviewer: admin.id },

    // Pending Submissions for Admin Queue
    { user: 'DinhPhuc', level: 'Sonic Wave', progress: 100, videoUrl: 'https://youtu.be/pending1', rawProofUrl: 'https://drive.google.com/raw1', hz: 240, device: 'PC', status: RecordStatus.PENDING, comment: 'First Extreme completed after 18k attempts! Raw footage provided.' },
    { user: 'AeroVN', level: 'Tartarus', progress: 92, videoUrl: 'https://youtu.be/pending2', rawProofUrl: 'https://drive.google.com/raw2', hz: 240, device: 'PC', status: RecordStatus.PENDING, comment: 'Unfortunate 92% fail on Tartarus last ship.' },
    { user: 'VNDasher99', level: 'I Wanna Defeat The Four Horsemen', timeMs: 290150, videoUrl: 'https://youtu.be/pending3', hz: 240, device: 'PC', status: RecordStatus.PENDING, comment: 'Platformer speedrun WR attempt.' },
  ];

  for (const r of recordsData) {
    const user = r.user === 'iNeQaH' ? admin : players[r.user];
    const level = classicLevels[r.level] || platformerLevels[r.level];
    if (user && level) {
      await prisma.record.create({
        data: {
          userId: user.id,
          levelId: level.id,
          progress: r.progress || null,
          timeMs: r.timeMs || null,
          videoUrl: r.videoUrl,
          rawProofUrl: r.rawProofUrl || null,
          hz: r.hz,
          device: r.device,
          comment: r.comment || null,
          status: r.status,
          reviewerId: r.reviewer || null,
          reviewedAt: r.status === RecordStatus.APPROVED ? new Date() : null,
        },
      });
    }
  }

  // 7. Calculate and Update Total PP for all users
  const allUsers = await prisma.user.findMany({
    include: {
      records: {
        where: { status: RecordStatus.APPROVED },
        include: { level: true },
      },
    },
  });

  for (const u of allUsers) {
    const classicBasePps = u.records
      .filter((rec) => rec.level.mode === LevelMode.CLASSIC && (rec.progress || 0) >= 100)
      .map((rec) => rec.level.basePp);
    
    const platformerBasePps = u.records
      .filter((rec) => rec.level.mode === LevelMode.PLATFORMER && rec.timeMs !== null)
      .map((rec) => rec.level.basePp);

    const classicPp = calcTotalPp(classicBasePps);
    const platformerPp = calcTotalPp(platformerBasePps);

    await prisma.user.update({
      where: { id: u.id },
      data: { classicPp, platformerPp },
    });
    console.log(`Updated ${u.username}: Classic PP = ${classicPp}, Platformer PP = ${platformerPp}`);
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
