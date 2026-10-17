import prisma from '@/lib/prisma';

export const NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function notificationRetentionCutoff() {
  return new Date(Date.now() - NOTIFICATION_RETENTION_MS);
}

export async function purgeExpiredNotifications(userId?: string) {
  const cutoff = notificationRetentionCutoff();
  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lte: cutoff },
      ...(userId ? { userId } : {}),
    },
  });

  // Also clean up expired OTPs and page visits older than 90 days to prevent unbounded database growth
  if (!userId) {
    try {
      await prisma.otp.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
      const pageVisitCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await prisma.pageVisit.deleteMany({
        where: { createdAt: { lte: pageVisitCutoff } },
      });
    } catch {
      /* ignore background cleanup errors */
    }
  }

  return result.count;
}
