export function levelPath(level: { gdLevelId: number }) {
  return `/levels/${level.gdLevelId}`;
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAllDigitsId(id: string) {
  return /^\d+$/.test(id);
}
