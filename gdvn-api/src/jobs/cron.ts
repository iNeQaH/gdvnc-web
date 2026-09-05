import cron from 'node-cron';
import prisma from '@/db/prisma';

export function setupJobs() {
  // Xóa notification h?t h?n m?i 3 ti?ng
  cron.schedule('0 */3 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const result = await prisma.notification.deleteMany({
        where: { createdAt: { lte: thirtyDaysAgo } }
      });
      console.log([Cron] Purged  expired notifications.);
    } catch (e) {
      console.error('[Cron] Error purging notifications', e);
    }
  });

  // Purge sheet timeline events m?i ngày lúc 1:00 UTC
  cron.schedule('0 1 * * *', async () => {
    try {
      const result = await prisma.timelineEvent.deleteMany({
        where: { sourceKey: { startsWith: 'gdvn-sheet:' } }
      });
      console.log([Cron] Purged  timeline events from sheet.);
    } catch (e) {
      console.error('[Cron] Error purging timeline events', e);
    }
  });

  console.log('[Jobs] Cron jobs initialized.');
}
