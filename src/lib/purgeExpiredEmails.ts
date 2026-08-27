import prisma from '@/lib/prisma';

export const EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function purgeExpiredUserEmails() {
  const cutoff = new Date(Date.now() - EMAIL_RETENTION_MS);
  const result = await prisma.user.updateMany({
    where: {
      email: { not: null },
      createdAt: { lte: cutoff },
    },
    data: { email: null },
  });
  return result.count;
}
