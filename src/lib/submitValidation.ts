const GD_LEVEL_ID_MIN = 1;
const GD_LEVEL_ID_MAX = 999_999_999;

export function parseSubmitGdLevelId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < GD_LEVEL_ID_MIN || n > GD_LEVEL_ID_MAX) return null;
  return n;
}

export function parseSubmitProgress(raw: unknown): number | null {
  if (raw === '' || raw == null) return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export function parseSubmitTimeMs(raw: unknown): number | null {
  if (raw === '' || raw == null) return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > 86_400_000) return null;
  return n;
}

export function parseSubmitHz(raw: unknown, fallback = 60): number {
  if (raw === '' || raw == null) return fallback;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > 999) return fallback;
  return n;
}

export function parseSubmitFps(raw: unknown): number | null {
  if (raw === '' || raw == null || Number.isNaN(Number(raw))) return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > 999) return null;
  return n;
}
