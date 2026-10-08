import prisma from '@/lib/prisma';

export async function logAudit(
  userId: string | null | undefined,
  action: string,
  details: any,
  ipAddress: string | null | undefined
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: details || {},
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
