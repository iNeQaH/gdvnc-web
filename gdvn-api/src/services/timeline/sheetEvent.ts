import type { ChronicleEvent } from '@/services/timeline/types';

export const SHEET_SOURCE_PREFIX = 'gdvn-sheet:';

export function gdvnSheetSourceKey(gdLevelId: number) {
  return `${SHEET_SOURCE_PREFIX}${gdLevelId}`;
}

export function parseSheetLevelId(event: Pick<ChronicleEvent, 'sourceKey' | 'fullDescription'>): number | null {
  if (event.sourceKey?.startsWith(SHEET_SOURCE_PREFIX)) {
    const n = Number(event.sourceKey.slice(SHEET_SOURCE_PREFIX.length));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const match = String(event.fullDescription || '').trim().match(/^ID\s+(\d+)$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseSheetCreator(shortDescription: string) {
  const line = String(shortDescription || '').split('\n')[0] || '';
  return line.replace(/\s*[·•].*$/, '').trim();
}

export function sheetEventMeta(event: ChronicleEvent) {
  const id = parseSheetLevelId(event);
  if (id == null) return null;
  return {
    id,
    creator: parseSheetCreator(event.shortDescription) || 'Unknown',
  };
}
