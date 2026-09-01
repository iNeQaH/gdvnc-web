import { mapDifficultyFace } from '@/lib/gdDifficulty';
import { gdvnSheetSourceKey, SHEET_SOURCE_PREFIX } from '@/lib/timeline/sheetEvent';
import type { TimelineTierId } from '@/lib/timeline/types';

export const GDVN_SHEET_ID_DEFAULT = '14ndp96aM0OesMp9TmAHXEAWDyLqZ2c3R1aRnJjMRZec';
/** Tab "List of Vietnamese Level" only. */
export const GDVN_SHEET_GID_DEFAULT = '904139984';

export const GDVN_SHEET_SOURCE_PREFIX = SHEET_SOURCE_PREFIX;
export { gdvnSheetSourceKey };

export type GdvnSheetRating = 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export type GdvnSheetRow = {
  gdLevelId: number;
  name: string;
  creatorName: string;
  difficulty: string;
  difficultyFace: number;
  ratingType: GdvnSheetRating;
  ratingLabel: string;
  ratedAt: Date | null;
  timelineTier: TimelineTierId;
};

const RATING_MAP: Record<string, { type: GdvnSheetRating; label: string; tier: TimelineTierId }> = {
  rate: { type: 'RATE', label: 'Rate', tier: 'day' },
  feature: { type: 'FEATURE', label: 'Feature', tier: 'day' },
  featured: { type: 'FEATURE', label: 'Feature', tier: 'day' },
  epic: { type: 'EPIC', label: 'Epic', tier: '1m' },
  legendary: { type: 'LEGENDARY', label: 'Legendary', tier: '6m' },
  mythic: { type: 'MYTHIC', label: 'Mythic', tier: '1y' },
};

export function timelineTierForRating(ratingType: string | null | undefined): TimelineTierId {
  const key = String(ratingType || '').trim().toLowerCase();
  return RATING_MAP[key]?.tier ?? 'day';
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, '');
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function headerIndex(headers: string[], ...needles: string[]) {
  for (const needle of needles) {
    const i = headers.findIndex((h) => h === needle || h.includes(needle));
    if (i >= 0) return i;
  }
  return -1;
}

function parseDifficulty(raw: string) {
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/\s*\([^)]*\)\s*$/u, '').trim() || trimmed;
  return { difficulty: cleaned || 'Unrated', difficultyFace: mapDifficultyFace(cleaned) };
}

export function parseRatedAt(raw: string): Date | null {
  const value = raw.trim();
  if (!value || value === '?' || /^[x×]$/i.test(value) || /^ko$/i.test(value)) return null;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidYmd(y, m, d)) return null;
    return utcNoon(y, m, d);
  }

  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const m = Number(us[1]);
    const d = Number(us[2]);
    const y = Number(us[3]);
    if (!isValidYmd(y, m, d)) return null;
    return utcNoon(y, m, d);
  }

  return null;
}

function isValidYmd(y: number, m: number, d: number) {
  if (y < 2013 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function utcNoon(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function parseGdvnSheetCsv(csv: string): GdvnSheetRow[] {
  const table = parseCsv(csv);
  if (table.length < 2) throw new Error('Sheet CSV trống.');

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const colId = headerIndex(headers, 'id');
  const colName = headerIndex(headers, 'name level', 'name');
  const colCreator = headerIndex(headers, 'creator');
  const colDiff = headerIndex(headers, 'difficulty');
  const colRating = headerIndex(headers, 'star rated', 'star');
  const colDate = headerIndex(headers, 'date rated', 'date');
  if (colId < 0 || colName < 0 || colRating < 0) {
    throw new Error('Không tìm thấy cột ID / Name / Star Rated trên tab sheet.');
  }

  const out: GdvnSheetRow[] = [];
  const seen = new Set<number>();

  for (const cells of table.slice(1)) {
    const idRaw = (cells[colId] || '').trim();
    if (!/^\d+$/.test(idRaw)) continue;
    const gdLevelId = Number(idRaw);
    if (!Number.isSafeInteger(gdLevelId) || gdLevelId <= 0) continue;
    if (seen.has(gdLevelId)) continue;

    const ratingRaw = (cells[colRating] || '').trim().toLowerCase();
    const rating = RATING_MAP[ratingRaw];
    if (!rating) continue;

    seen.add(gdLevelId);
    const name = (cells[colName] || '').trim() || `Level ${gdLevelId}`;
    const creatorName = (colCreator >= 0 ? cells[colCreator] : '')?.trim() || 'Unknown';
    const { difficulty, difficultyFace } = parseDifficulty(colDiff >= 0 ? cells[colDiff] || '' : '');
    const ratedAt = colDate >= 0 ? parseRatedAt(cells[colDate] || '') : null;

    out.push({
      gdLevelId,
      name,
      creatorName,
      difficulty,
      difficultyFace,
      ratingType: rating.type,
      ratingLabel: rating.label,
      ratedAt,
      timelineTier: rating.tier,
    });
  }

  return out;
}

export function gdvnSheetExportUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchGdvnSheetRows(): Promise<GdvnSheetRow[]> {
  const sheetId = process.env.GDVN_SHEET_ID || GDVN_SHEET_ID_DEFAULT;
  const gid = process.env.GDVN_SHEET_GID || GDVN_SHEET_GID_DEFAULT;
  const url = process.env.GDVN_SHEET_CSV_URL || gdvnSheetExportUrl(sheetId, gid);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let csv = '';
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/csv,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; GDVNSheetSync/1.0)',
      },
    });
    if (!res.ok) {
      throw new Error(`Google Sheet HTTP ${res.status}`);
    }
    csv = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const sample = csv.slice(0, 80).toLowerCase();
  if (!csv.trim() || sample.includes('<html') || sample.includes('<!doctype')) {
    throw new Error('Không đọc được CSV công khai của tab List of Vietnamese Level.');
  }

  const rows = parseGdvnSheetCsv(csv);
  if (rows.length < 10) {
    throw new Error(`Sheet trả về quá ít level (${rows.length}).`);
  }
  return rows;
}
