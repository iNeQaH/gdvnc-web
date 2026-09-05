import { RecordStatus } from '@prisma/client';

export const ADMIN_LIST_LIMIT = 10;

export const QUEUE_STATUSES: Record<string, RecordStatus> = {
  PENDING: RecordStatus.PENDING,
  APPROVED: RecordStatus.APPROVED,
  REJECTED: RecordStatus.REJECTED,
};

export function parsePageParam(raw: string | null): number {
  const n = Number.parseInt(raw || '1', 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export type QueueCounts = { pending: number; approved: number; rejected: number };

export function queueFilterTotal(counts: QueueCounts, status: RecordStatus | undefined): number {
  if (!status) return counts.pending + counts.approved + counts.rejected;
  if (status === RecordStatus.PENDING) return counts.pending;
  if (status === RecordStatus.APPROVED) return counts.approved;
  return counts.rejected;
}

/** `undefined` means ALL statuses. */
export function parseQueueStatusParam(raw: string | null): RecordStatus | undefined {
  const key = (raw || 'ALL').toUpperCase();
  if (key === 'ALL' || key === '') return undefined;
  return QUEUE_STATUSES[key] || RecordStatus.PENDING;
}

export function sortModerationQueue<
  T extends { status: RecordStatus; submittedAt: Date; reviewedAt: Date | null },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.status === RecordStatus.PENDING ? 0 : 1;
    const pb = b.status === RecordStatus.PENDING ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (a.status === RecordStatus.PENDING) {
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    }
    return (b.reviewedAt ?? b.submittedAt).getTime() - (a.reviewedAt ?? a.submittedAt).getTime();
  });
}
