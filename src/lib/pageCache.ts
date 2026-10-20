/**
 * Bộ nhớ đệm trạng thái trang phía client (sessionStorage + in-memory):
 * Lưu lại dữ liệu của trang và chỉ tự động cập nhật lại sau 5 phút (300,000ms).
 */

const memoryCache = new Map<string, { savedAt: number; data: any }>();

export function getCachedPageState<T>(key: string, ttlMs = 5 * 60 * 1000): T | null {
  const now = Date.now();

  // 1. Kiểm tra memory cache trước
  const mem = memoryCache.get(key);
  if (mem && now - mem.savedAt < ttlMs) {
    return mem.data as T;
  }

  // 2. Kiểm tra sessionStorage
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`gdvnc_page_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.savedAt) return null;
    if (now - parsed.savedAt > ttlMs) {
      sessionStorage.removeItem(`gdvnc_page_${key}`);
      memoryCache.delete(key);
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function setCachedPageState<T>(key: string, data: T): void {
  const record = { savedAt: Date.now(), data };
  memoryCache.set(key, record);

  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`gdvnc_page_${key}`, JSON.stringify(record));
  } catch {
    // QuotaExceeded hoặc private mode: bỏ qua
  }
}

export function clearCachedPageState(key: string): void {
  memoryCache.delete(key);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`gdvnc_page_${key}`);
  } catch {}
}
