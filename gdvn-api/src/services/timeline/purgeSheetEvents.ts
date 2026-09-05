import prisma from '@/services/prisma';
import { SHEET_SOURCE_PREFIX } from '@/services/timeline/sheetEvent';

export async function purgeSheetTimelineEvents() {
  const result = await prisma.timelineEvent.deleteMany({
    where: { sourceKey: { startsWith: SHEET_SOURCE_PREFIX } },
  });
  return result.count;
}
