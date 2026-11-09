const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Publishing Week 1 Recap (2026-W45) ---');

  const targetWeek = '2026-W45';
  const weekNumber = 1;

  // Check if recap already exists
  const existing = await prisma.weeklyActivityRecap.findUnique({
    where: { weekString: targetWeek },
  });
  if (existing) {
    console.log('Week 1 recap already exists:', existing.id);
    return;
  }

  const topPlayers = [
    {
      userId: '7d013977-1049-43c3-8ebf-366579b5463f',
      username: 'Azs',
      displayName: 'AZS',
      clanTag: 'ZSB',
      points: 1125,
      streak: 1,
    },
    {
      userId: '6037f007-8495-4654-a69c-f9e4eb5ce910',
      username: 'hewochat',
      displayName: 'b',
      clanTag: 'ZSB',
      points: 958,
      streak: 1,
    },
    {
      userId: 'b0d6a066-5e04-45e3-99d8-941d6b052d9b',
      username: 'steeen',
      displayName: 'steeen',
      clanTag: 'AC',
      points: 792,
      streak: 1,
    },
    {
      userId: 'b7daec13-3ef4-4775-b6eb-bb1d8fc8c973',
      username: 'heruhgj',
      displayName: 'Heru',
      clanTag: 'ZSB',
      points: 690,
      streak: 1,
    },
    {
      userId: '45d7a8d5-91d4-4bb8-86d7-ea8196696dbf',
      username: 'YukkaXL08',
      displayName: 'YukkaXL08',
      clanTag: 'UWU',
      points: 482,
      streak: 1,
    },
  ];

  const topClans = [
    {
      clanId: 'zsb-id',
      name: "Zophisus's Bay",
      tag: 'ZSB',
      slug: 'zsb',
      points: 3389,
      streak: 1,
    },
    {
      clanId: 'uwu-id',
      name: 'UWU',
      tag: 'UWU',
      slug: 'uwu',
      points: 1374,
      streak: 1,
    },
    {
      clanId: 'ac-id',
      name: 'AetherCrag',
      tag: 'AC',
      slug: 'ac',
      points: 920,
      streak: 1,
    },
    {
      clanId: 'ego-id',
      name: 'EGO',
      tag: 'EGO',
      slug: 'ego',
      points: 587,
      streak: 1,
    },
    {
      clanId: 'bro-id',
      name: 'Phòng Ngủ',
      tag: 'BRO',
      slug: 'bro',
      points: 558,
      streak: 1,
    },
  ];

  // Look up real clan IDs if they exist in DB
  const clanSlugs = topClans.map(c => c.slug);
  const dbClans = await prisma.clan.findMany({
    where: { slug: { in: clanSlugs } },
    select: { id: true, slug: true }
  });
  const clanIdBySlug = new Map(dbClans.map(c => [c.slug, c.id]));
  for (const c of topClans) {
    if (clanIdBySlug.has(c.slug)) {
      c.clanId = clanIdBySlug.get(c.slug);
    }
  }

  // Look up real user IDs if they exist in DB
  const usernames = topPlayers.map(p => p.username);
  const dbUsers = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true }
  });
  const userIdByName = new Map(dbUsers.map(u => [u.username, u.id]));
  for (const p of topPlayers) {
    if (userIdByName.has(p.username)) {
      p.userId = userIdByName.get(p.username);
    }
  }

  const postTitle = '# Tuần đầu tiên đã kết thúc! Chúc mừng top 5 của tuần này!';
  const body = [
    '# **Kết quả tuần đầu tiên:**',
    '> Top 5 người chơi mạnh nhất:',
    `- **1. [ZSB] [AZS](https://geodat.vn/profile/Azs) - 1,125 điểm (1🔥)**`,
    `- 2. [ZSB] [b](https://geodat.vn/profile/hewochat) - 958 điểm (1🔥)`,
    `- 3. [AC] [steeen](https://geodat.vn/profile/steeen) - 792 điểm (1🔥)`,
    `- 4. [ZSB] [Heru](https://geodat.vn/profile/heruhgj) - 690 điểm (1🔥)`,
    `- 5. [UWU] [YukkaXL08](https://geodat.vn/profile/YukkaXL08) - 482 điểm (1🔥)`,
    '---',
    '> Top 5 Clan mạnh nhất:',
    `- **1. [ZSB] [Zophisus's Bay](https://geodat.vn/clan/zsb) - 3,389 điểm (1🔥)**`,
    `- 2. [UWU] [UWU](https://geodat.vn/clan/uwu) - 1,374 điểm (1🔥)`,
    `- 3. [AC] [AetherCrag](https://geodat.vn/clan/ac) - 920 điểm (1🔥)`,
    `- 4. [EGO] [EGO](https://geodat.vn/clan/ego) - 587 điểm (1🔥)`,
    `- 5. [BRO] [Phòng Ngủ](https://geodat.vn/clan/bro) - 558 điểm (1🔥)`,
    '*🔥 là số chuỗi có mặt trên BXH.*'
  ].join('\n');

  const notifTitle = postTitle;
  const notifExcerpt = '🔥 là số chuỗi có mặt trên BXH.';
  const notifBody = body;
  const postBody = body;

  const author = await prisma.user.findFirst({
    where: { username: { equals: 'iNeQaH', mode: 'insensitive' } },
    select: { id: true },
  }) || await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.homePost.create({
      data: {
        title: postTitle,
        body: postBody,
        authorId: author ? author.id : null,
        isPinned: true,
      },
    });

    await tx.timelineEvent.upsert({
      where: { sourceKey: `weekly-recap:${targetWeek}` },
      create: {
        sourceKey: `weekly-recap:${targetWeek}`,
        title: 'Tuần đầu tiên đã kết thúc!',
        shortDescription: notifExcerpt,
        fullDescription: `<h2><strong>Kết quả tuần đầu tiên:</strong></h2><blockquote>Top 5 người chơi mạnh nhất:</blockquote><ul><li><strong>1. [ZSB] <a href="https://geodat.vn/profile/Azs">AZS</a> - 1,125 điểm (1🔥)</strong></li><li>2. [ZSB] <a href="https://geodat.vn/profile/hewochat">b</a> - 958 điểm (1🔥)</li><li>3. [AC] <a href="https://geodat.vn/profile/steeen">steeen</a> - 792 điểm (1🔥)</li><li>4. [ZSB] <a href="https://geodat.vn/profile/heruhgj">Heru</a> - 690 điểm (1🔥)</li><li>5. [UWU] <a href="https://geodat.vn/profile/YukkaXL08">YukkaXL08</a> - 482 điểm (1🔥)</li></ul><hr /><blockquote>Top 5 Clan mạnh nhất:</blockquote><ul><li><strong>1. [ZSB] <a href="https://geodat.vn/clan/zsb">Zophisus\'s Bay</a> - 3,389 điểm (1🔥)</strong></li><li>2. [UWU] <a href="https://geodat.vn/clan/uwu">UWU</a> - 1,374 điểm (1🔥)</li><li>3. [AC] <a href="https://geodat.vn/clan/ac">AetherCrag</a> - 920 điểm (1🔥)</li><li>4. [EGO] <a href="https://geodat.vn/clan/ego">EGO</a> - 587 điểm (1🔥)</li><li>5. [BRO] <a href="https://geodat.vn/clan/bro">Phòng Ngủ</a> - 558 điểm (1🔥)</li></ul><p><em>🔥 là số chuỗi có mặt trên BXH.</em></p>`,
        startAt: new Date(),
        endAt: new Date(),
        tier: 'week',
        nature: 'positive',
        glowColor: '#f59e0b',
      },
      update: {},
    });

    const recap = await tx.weeklyActivityRecap.create({
      data: {
        weekString: targetWeek,
        weekNumber,
        topPlayers,
        topClans,
        homePostId: post.id,
        announcementId: null,
      },
    });

    return { post, recap };
  });

  console.log('Published Week 1 recap successfully:', result.recap.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
