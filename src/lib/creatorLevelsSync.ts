import prisma from '@/lib/prisma';

export async function autoLinkUserCreatedLevels(
  userId: string,
  gdUsername?: string | null,
  username?: string | null
) {
  const names = Array.from(
    new Set([gdUsername?.trim(), username?.trim()].filter((n): n is string => Boolean(n && n.length > 0)))
  );

  if (names.length === 0) return [];

  try {
    // 1. Tự động gán creatorId = userId cho toàn bộ các màn chơi trong DB có creatorName trùng khớp
    await prisma.level.updateMany({
      where: {
        OR: names.map((name) => ({
          creatorName: { equals: name, mode: 'insensitive' as const },
        })),
        creatorId: null,
      },
      data: { creatorId: userId },
    });
  } catch (err) {
    console.warn('autoLinkUserCreatedLevels update error:', err);
  }

  // 2. Trả về tất cả level của user trong DB (cả theo creatorId lẫn creatorName)
  try {
    const levels = await prisma.level.findMany({
      where: {
        OR: [
          { creatorId: userId },
          ...names.map((name) => ({
            creatorName: { equals: name, mode: 'insensitive' as const },
          })),
        ],
      },
      select: {
        id: true,
        gdLevelId: true,
        name: true,
        mode: true,
        placement: true,
        basePp: true,
        difficulty: true,
        ratingType: true,
        youtubeId: true,
        difficultyFace: true,
        isVN: true,
        isChallenge: true,
      },
      orderBy: { name: 'asc' },
    });

    return levels;
  } catch (err) {
    console.warn('autoLinkUserCreatedLevels find error:', err);
    return [];
  }
}
