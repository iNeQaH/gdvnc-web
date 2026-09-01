import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

/** CP comes only from manual awards (approved works' cpGranted + admin set). Badges never add CP. */
export async function recalculateCreatorPoints(userId: string): Promise<number> {
  const works = await prisma.creatorWork.findMany({
    where: { userId, status: RecordStatus.APPROVED },
    select: { cpGranted: true },
  });

  const total = Math.round(works.reduce((sum, work) => sum + (work.cpGranted || 0), 0) * 10) / 10;

  await prisma.user.update({
    where: { id: userId },
    data: { creatorPoints: total },
  });

  return total;
}
