import { RecordStatus } from '@prisma/client';

export const QUEUE_STATUSES: Record<string, RecordStatus> = {
  PENDING: RecordStatus.PENDING,
  APPROVED: RecordStatus.APPROVED,
  REJECTED: RecordStatus.REJECTED,
};

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
