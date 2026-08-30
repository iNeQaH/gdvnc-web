import type { AnnouncementAudience, Role } from '@prisma/client';

export const ANNOUNCEMENT_AUDIENCES = ['ALL', 'ADMIN', 'MODERATOR', 'SUPPORTER', 'USERS'] as const;

export type Viewer = {
  id: string;
  role: Role | string;
  supporterUntil: Date | null;
};

export function isAnnouncementAudience(value: string): value is AnnouncementAudience {
  return (ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(value);
}

export function isActiveSupporter(until: Date | null | undefined) {
  return !!until && until.getTime() > Date.now();
}

export function canSeeAnnouncement(
  viewer: Viewer | null,
  announcement: { audience: AnnouncementAudience | string; targetUserIds: string[] }
): boolean {
  const audience = String(announcement.audience);
  if (audience === 'ALL') return true;
  if (!viewer) return false;
  if (audience === 'ADMIN') return viewer.role === 'ADMIN';
  if (audience === 'MODERATOR') return viewer.role === 'MODERATOR';
  if (audience === 'SUPPORTER') return isActiveSupporter(viewer.supporterUntil);
  if (audience === 'USERS') return announcement.targetUserIds.includes(viewer.id);
  return false;
}

export function serializeAnnouncement(
  row: {
    id: string;
    title: string;
    excerpt: string;
    body: string;
    audience: AnnouncementAudience | string;
    targetUserIds: string[];
    createdAt: Date;
    updatedAt: Date;
    author: { username: string };
  },
  opts?: { includeTargets?: boolean; isRead?: boolean }
) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    audience: row.audience,
    author: row.author.username,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(opts?.includeTargets ? { targetUserIds: row.targetUserIds } : {}),
    ...(opts?.isRead != null ? { isRead: opts.isRead } : {}),
  };
}
