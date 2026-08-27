import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';
import { computeCreatorPointsFromBadges } from '@/lib/creatorPoints';

export async function recalculateCreatorPoints(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userBadges: { include: { badge: true } },
      creatorWorks: {
        where: { status: RecordStatus.APPROVED },
        select: { cpGranted: true },
      },
    },
  });

  if (!user) return 0;

  const extraCp = user.creatorWorks.reduce((sum, work) => sum + (work.cpGranted || 0), 0);
  const total = computeCreatorPointsFromBadges(
    user.userBadges.map((ub) => ub.badge.name),
    extraCp
  );

  await prisma.user.update({
    where: { id: userId },
    data: { creatorPoints: total },
  });

  return total;
}
