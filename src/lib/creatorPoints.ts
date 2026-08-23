import prisma from '@/lib/prisma';
import { RecordStatus } from '@prisma/client';

export const DECO_BADGE_CP: Record<string, number> = {
  star: 1,
  feature: 2,
  featured: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

export const LAYOUT_BADGE_CP: Record<string, number> = {
  beginner: 0.1,
  normal: 0.2,
  good: 1,
  cool: 2,
  professional: 3,
};

export const DECO_BADGE_ORDER = ['Star', 'Feature', 'Epic', 'Legendary', 'Mythic'] as const;
export const LAYOUT_BADGE_ORDER = ['Beginner', 'Normal', 'Good', 'Cool', 'Professional'] as const;

function normalizeBadgeName(name: string): string {
  return String(name || '').trim().toLowerCase();
}

export function getDecoBadgeCp(name: string): number | null {
  const key = normalizeBadgeName(name);
  if (key in DECO_BADGE_CP) return DECO_BADGE_CP[key];
  if (key.startsWith('feature')) return DECO_BADGE_CP.feature;
  return null;
}

export function getLayoutBadgeCp(name: string): number | null {
  const key = normalizeBadgeName(name);
  if (key in LAYOUT_BADGE_CP) return LAYOUT_BADGE_CP[key];
  return null;
}

export function isDecoBadgeName(name: string): boolean {
  return getDecoBadgeCp(name) !== null;
}

export function isLayoutBadgeName(name: string): boolean {
  return getLayoutBadgeCp(name) !== null;
}

export function formatCp(value: number | null | undefined): string {
  const n = Number(value || 0);
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function roundCp(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeCreatorPointsFromBadges(
  badgeNames: string[],
  extraCp = 0
): number {
  let deco = 0;
  let layout = 0;

  for (const name of badgeNames) {
    const decoVal = getDecoBadgeCp(name);
    if (decoVal !== null) deco = Math.max(deco, decoVal);
    const layoutVal = getLayoutBadgeCp(name);
    if (layoutVal !== null) layout = Math.max(layout, layoutVal);
  }

  return roundCp(deco + layout + (Number(extraCp) || 0));
}

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
