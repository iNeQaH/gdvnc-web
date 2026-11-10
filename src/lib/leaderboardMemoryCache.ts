/**
 * In-Memory Event-Driven Cache for Leaderboards and Highlights.
 *
 * Chạy trực tiếp trên RAM của tiến trình Node.js (PM2 single-instance trên VPS).
 * - Đọc siêu tốc (<0.05ms) trực tiếp từ RAM, 0 truy vấn Database khi dữ liệu không đổi.
 * - Xóa cache tức thì (0ms) khi có bất kỳ thay đổi điểm (profile sync, duyệt kỷ lục, đổi clan, verify GD, weekly recap).
 * - Tự động chống Request Stampede (coalescing các promise đồng thời).
 * - Hỗ trợ ETag & Versioning để trình duyệt nhận 304 Not Modified tiết kiệm 100% băng thông.
 */

interface CacheEntry<T = any> {
  data: T;
  savedAt: number;
  version: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __gdvncLeaderboardCache: Map<string, CacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __gdvncLeaderboardVersion: number | undefined;
  // eslint-disable-next-line no-var
  var __gdvncInFlightLeaderboard: Map<string, Promise<any>> | undefined;
}

const cacheMap: Map<string, CacheEntry> =
  globalThis.__gdvncLeaderboardCache || (globalThis.__gdvncLeaderboardCache = new Map());

let globalVersion: number =
  globalThis.__gdvncLeaderboardVersion || (globalThis.__gdvncLeaderboardVersion = Date.now());

const inFlightMap: Map<string, Promise<any>> =
  globalThis.__gdvncInFlightLeaderboard || (globalThis.__gdvncInFlightLeaderboard = new Map());

// Thời gian tối đa giữ trên RAM phòng trường hợp có thay đổi DB trực tiếp từ ngoài: 10 phút
const DEFAULT_SAFETY_TTL_MS = 10 * 60 * 1000;

export function getLeaderboardVersion(): number {
  return globalThis.__gdvncLeaderboardVersion || globalVersion;
}

export function getLeaderboardMemoryCache<T = any>(
  key: string,
  maxAgeMs = DEFAULT_SAFETY_TTL_MS
): T | null {
  const currentVersion = getLeaderboardVersion();
  const entry = cacheMap.get(key);
  if (!entry) return null;

  // Nếu version không khớp hoặc quá hạn TTL an toàn -> bỏ
  if (entry.version !== currentVersion || Date.now() - entry.savedAt > maxAgeMs) {
    cacheMap.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setLeaderboardMemoryCache<T = any>(key: string, data: T): void {
  const currentVersion = getLeaderboardVersion();
  cacheMap.set(key, {
    data,
    savedAt: Date.now(),
    version: currentVersion,
  });
}

export function invalidateLeaderboardMemoryCache(): void {
  globalVersion = Date.now();
  globalThis.__gdvncLeaderboardVersion = globalVersion;
  cacheMap.clear();
  inFlightMap.clear();
}

/**
 * Gom nhóm các request đồng thời đến cùng 1 key để chỉ chạy DB query đúng 1 lần duy nhất.
 */
export async function coalesceLeaderboardQuery<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlightMap.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      inFlightMap.delete(key);
    }
  })();

  inFlightMap.set(key, promise);
  return promise;
}
