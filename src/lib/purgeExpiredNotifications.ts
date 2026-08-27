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
  return result.count;
}
