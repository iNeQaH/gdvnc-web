import { isStaffRole, type JwtPayload } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const REVIEWER_SELECT = { id: true, username: true, gdUsername: true } as const;

export function reviewerNameFrom(
  reviewer?: { username?: string | null; gdUsername?: string | null } | null
): string | null {
  const name = reviewer?.username?.trim() || reviewer?.gdUsername?.trim();
  return name || null;
}

export async function resolveStaffReviewerId(
  admin: JwtPayload,
  fallbackId?: string | null
): Promise<string | null> {
  const ids = [admin.userId, fallbackId].filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  for (const id of ids) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (user && isStaffRole(user.role)) return user.id;
  }
  const username = typeof admin.username === 'string' ? admin.username.trim() : '';
  if (username) {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, role: true },
    });
    if (user && isStaffRole(user.role)) return user.id;
  }
  return null;
}

export async function creatorWorkPairSet(): Promise<Set<string>> {
  const rows = await prisma.creatorWork.findMany({
    where: { gdLevelId: { not: null } },
    select: { userId: true, gdLevelId: true },
  });
  return new Set(
    rows
      .filter((row): row is { userId: string; gdLevelId: number } => typeof row.gdLevelId === 'number')
      .map((row) => `${row.userId}:${row.gdLevelId}`)
  );
}
