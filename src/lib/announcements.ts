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
    author: { username: string } | null;
    expiresAt?: Date | null;
    likedUserIds?: string[];
    poll?: any;
  },
  opts?: { includeTargets?: boolean; isRead?: boolean; viewerId?: string }
) {
  const likesCount = Array.isArray(row.likedUserIds) ? row.likedUserIds.length : 0;
  const isLiked = Boolean(opts?.viewerId && Array.isArray(row.likedUserIds) && row.likedUserIds.includes(opts.viewerId));

  let pollData = null;
  if (row.poll && typeof row.poll === 'object') {
    const p = row.poll as any;
    const votes = (p.votes && typeof p.votes === 'object') ? p.votes : {};
    const totalVoters = Object.keys(votes).length;
    const myVotes: number[] = opts?.viewerId ? (votes[opts.viewerId] || []) : [];

    const options = Array.isArray(p.options) ? p.options : [];
    const counts = options.map(() => 0);
    Object.values(votes).forEach((userVoteIndices: any) => {
      if (Array.isArray(userVoteIndices)) {
        userVoteIndices.forEach((idx: number) => {
          if (idx >= 0 && idx < counts.length) {
            counts[idx]++;
          }
        });
      }
    });

    pollData = {
      question: p.question || '',
      options: options.map((opt: string, idx: number) => ({
        text: opt,
        votes: counts[idx] || 0,
        percentage: totalVoters > 0 ? Math.round(((counts[idx] || 0) / totalVoters) * 100) : 0,
      })),
      allowMultiple: Boolean(p.allowMultiple),
      totalVoters,
      myVotes,
    };
  }

  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    audience: row.audience,
    author: row.author?.username || 'Hệ thống',
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    likesCount,
    isLiked,
    poll: pollData,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(opts?.includeTargets ? { targetUserIds: row.targetUserIds } : {}),
    ...(opts?.isRead != null ? { isRead: opts.isRead } : {}),
  };
}
