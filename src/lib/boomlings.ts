/**
 * GDVN Boomlings Client - Giao tiếp trực tiếp với máy chủ gốc RobTop (boomlings.com)
 * Thay thế hoàn toàn GDBrowser với cơ chế:
 * - Paced Queue (350ms): Chống burst request & chống khóa IP
 * - In-flight deduplication: Chống gửi trùng request đồng thời
 * - Bộ nhớ đệm accountID (24h) & Level info (5 phút)
 * - Gom nhiều Level vào 1 request (type=10 batching, nhanh gấp 16 lần)
 * - Circuit Breaker & Fallback tự động khi có sự cố mạng
 */

const BOOMLINGS_BASE = process.env.BOOMLINGS_API_URL || 'https://www.boomlings.com/database';
const GD_SECRET = 'Wmfd2893gb7';
const ENABLE_GDBROWSER_FALLBACK = process.env.GD_ENABLE_GDBROWSER_FALLBACK !== 'false';

export interface NormalizedGdProfile {
  username: string;
  playerId: number;
  accountId: number;
  stars: number;
  moons: number;
  demons: number;
  diamonds: number;
  secretCoins: number;
  userCoins: number;
  cp: number;
  rank: number;
  hasGlobalRank: boolean;
  youtube?: string;
  twitter?: string;
  twitch?: string;
  discord?: string;
  demonBreakdown?: number[];
}

export interface NormalizedGdLevel {
  id: number;
  gdLevelId: number;
  name: string;
  author: string; // Tương thích pickGdCreatorName
  creator: string; // Tương thích pickGdCreatorName
  creatorName: string;
  difficulty: string;
  difficultyFace: number; // 0..14
  ratingType: 'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  stars: number;
  featured: number;
  epic: number;
  platformer: boolean;
  isPlatformer: boolean;
  isDemon: boolean;
  demonDifficulty: number;
  downloads: number;
  likes: number;
  description: string;
  youtube?: string | null;
  video?: string | null;
}

// ==========================================
// 1. In-Memory Caches & Paced Queue
// ==========================================

const accountIdCache = new Map<string, { accountId: number; expiresAt: number }>();
const levelCache = new Map<number, { data: NormalizedGdLevel; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<string>>();

// Circuit Breaker: nếu Boomlings liên tục lỗi, tạm chuyển sang fallback
let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;

function isCircuitBreakerOpen(): boolean {
  return Date.now() < circuitBreakerOpenUntil;
}

function recordSuccess() {
  consecutiveFailures = 0;
}

function recordFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= 4) {
    // Tạm mở circuit breaker trong 5 phút
    circuitBreakerOpenUntil = Date.now() + 5 * 60 * 1000;
  }
}

// Hàng đợi tuần tự giãn cách tối thiểu 350ms giữa các request đi tới Boomlings
let queueTail = Promise.resolve();
const REQUEST_SPACING_MS = 350;

function enqueuePacedRequest<T>(fn: () => Promise<T>): Promise<T> {
  const current = queueTail.then(async () => {
    try {
      return await fn();
    } finally {
      await new Promise((r) => setTimeout(r, REQUEST_SPACING_MS));
    }
  });
  queueTail = current.then(() => {}, () => {});
  return current;
}

// ==========================================
// 2. Core HTTP Requester
// ==========================================

export function parseRobTopMap(raw: string, delimiter = ':'): Record<string, string> {
  const parts = raw.split(delimiter);
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < parts.length; i += 2) {
    map[parts[i]] = parts[i + 1];
  }
  return map;
}

async function fetchBoomlingsRaw(endpoint: string, params: Record<string, string | number>, timeoutMs = 6000): Promise<string> {
  if (isCircuitBreakerOpen()) {
    throw new Error('Boomlings circuit breaker is open');
  }

  const cacheKey = `${endpoint}?${JSON.stringify(params)}`;
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = enqueuePacedRequest(async () => {
    const body = new URLSearchParams({
      gameVersion: '22',
      binaryVersion: '42',
      secret: GD_SECRET,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${BOOMLINGS_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': '', // Bắt buộc để chuỗi rỗng để vượt Cloudflare của RobTop
        },
        body: body.toString(),
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Boomlings returned status ${res.status}`);
      }

      const text = (await res.text()).trim();

      // Kiểm tra phản hồi HTML (thường là trang chặn Cloudflare hoặc lỗi 502)
      if (text.startsWith('<!DOCTYPE html>') || text.startsWith('<html') || text.includes('cf-browser-verification')) {
        throw new Error('Boomlings returned Cloudflare HTML challenge');
      }

      recordSuccess();
      return text;
    } catch (err) {
      clearTimeout(timer);
      recordFailure();
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ==========================================
// 3. Level Normalizer
// ==========================================

function extractYoutubeLink(desc: string): string | null {
  if (!desc) return null;
  const match = desc.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : null;
}

function normalizeRawLevel(lvl: Record<string, string>, creatorName: string): NormalizedGdLevel {
  const id = Number(lvl['1']);
  const name = lvl['2'] || 'Unknown';
  const isPlatformer = lvl['15'] === '5';
  const isDemon = lvl['17'] === '1';
  const isAuto = lvl['25'] === '1';

  let difficultyFace = 0;
  let difficultyStr = 'N/A';

  if (isAuto) {
    difficultyFace = 1;
    difficultyStr = 'Auto';
  } else if (isDemon) {
    const demonDiff = Number(lvl['43'] || 0);
    if (demonDiff === 6) {
      difficultyFace = 14;
      difficultyStr = 'Extreme Demon';
    } else if (demonDiff === 5) {
      difficultyFace = 13;
      difficultyStr = 'Insane Demon';
    } else if (demonDiff === 4) {
      difficultyFace = 11;
      difficultyStr = 'Medium Demon';
    } else if (demonDiff === 3) {
      difficultyFace = 10;
      difficultyStr = 'Easy Demon';
    } else {
      difficultyFace = 12;
      difficultyStr = 'Hard Demon';
    }
  } else {
    const diffVal = Number(lvl['9'] || 0);
    if (diffVal === 10) {
      difficultyFace = 2;
      difficultyStr = 'Easy';
    } else if (diffVal === 20) {
      difficultyFace = 3;
      difficultyStr = 'Normal';
    } else if (diffVal === 30) {
      difficultyFace = 4;
      difficultyStr = 'Hard';
    } else if (diffVal === 40) {
      difficultyFace = 6;
      difficultyStr = 'Harder';
    } else if (diffVal === 50) {
      difficultyFace = 8;
      difficultyStr = 'Insane';
    }
  }

  const stars = Number(lvl['18'] || 0);
  const featured = Number(lvl['19'] || 0);
  const epic = Number(lvl['42'] || 0);

  let ratingType: 'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' = 'NONE';
  if (epic === 3) ratingType = 'MYTHIC';
  else if (epic === 2) ratingType = 'LEGENDARY';
  else if (epic === 1) ratingType = 'EPIC';
  else if (featured > 0) ratingType = 'FEATURE';
  else if (stars > 0) ratingType = 'RATE';

  let description = '';
  if (lvl['3']) {
    try {
      const b64 = lvl['3'].replace(/-/g, '+').replace(/_/g, '/');
      description = Buffer.from(b64, 'base64').toString('utf8');
    } catch {
      description = '';
    }
  }

  const ytId = extractYoutubeLink(description);

  return {
    id,
    gdLevelId: id,
    name,
    author: creatorName,
    creator: creatorName,
    creatorName,
    difficulty: difficultyStr,
    difficultyFace,
    ratingType,
    stars,
    featured,
    epic,
    platformer: isPlatformer,
    isPlatformer,
    isDemon,
    demonDifficulty: Number(lvl['43'] || 0),
    downloads: Number(lvl['10'] || 0),
    likes: Number(lvl['14'] || 0),
    description,
    youtube: ytId,
    video: ytId,
  };
}

// ==========================================
// 4. Public API: Level Fetchers
// ==========================================

export async function fetchGdLevel(gdLevelId: number): Promise<NormalizedGdLevel | null> {
  if (!Number.isFinite(gdLevelId) || gdLevelId <= 0) return null;

  // 1. Kiểm tra cache RAM
  const cached = levelCache.get(gdLevelId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 2. Thử gọi trực tiếp Boomlings
  try {
    const raw = await fetchBoomlingsRaw('getGJLevels21.php', { str: gdLevelId, type: 0 });
    if (raw && raw !== '-1') {
      const [levelsPart, creatorsPart] = raw.split('#');
      const firstLevelStr = levelsPart?.split('|')?.[0];
      if (firstLevelStr) {
        const lvl = parseRobTopMap(firstLevelStr);
        if (Number(lvl['1']) === gdLevelId) {
          let creatorName = 'Unknown';
          if (creatorsPart) {
            for (const c of creatorsPart.split('|')) {
              const [pId, cName] = c.split(':');
              if (pId === lvl['6']) {
                creatorName = cName;
                break;
              }
            }
          }
          const data = normalizeRawLevel(lvl, creatorName);
          levelCache.set(gdLevelId, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
          return data;
        }
      }
    }
  } catch (err) {
    // Lỗi Boomlings: nếu có bật fallback sang GDBrowser
    if (!ENABLE_GDBROWSER_FALLBACK) {
      console.warn(`[boomlings] fetchGdLevel failed for ${gdLevelId}:`, err);
      return null;
    }
  }

  // 3. Fallback sang GDBrowser nếu được bật
  if (ENABLE_GDBROWSER_FALLBACK) {
    try {
      const res = await fetch(`https://gdbrowser.com/api/level/${gdLevelId}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (String(json.id) !== String(gdLevelId)) return null;

      const diffFace = typeof json.difficultyFace === 'number' ? json.difficultyFace : 0;
      let rType: 'NONE' | 'RATE' | 'FEATURE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' = 'NONE';
      if (json.epic === 3 || json.epic === '3' || json.mythic) rType = 'MYTHIC';
      else if (json.epic === 2 || json.epic === '2' || json.legendary) rType = 'LEGENDARY';
      else if (json.epic === 1 || json.epic === '1' || json.epic === true) rType = 'EPIC';
      else if (json.featured && json.featured !== '0') rType = 'FEATURE';
      else if (json.stars > 0) rType = 'RATE';

      const data: NormalizedGdLevel = {
        id: Number(json.id),
        gdLevelId: Number(json.id),
        name: json.name || 'Unknown',
        author: json.author || json.creator || 'Unknown',
        creator: json.author || json.creator || 'Unknown',
        creatorName: json.author || json.creator || 'Unknown',
        difficulty: String(json.difficulty || 'N/A'),
        difficultyFace: diffFace,
        ratingType: rType,
        stars: Number(json.stars || 0),
        featured: json.featured ? 1 : 0,
        epic: Number(json.epic || 0),
        platformer: !!json.platformer,
        isPlatformer: !!json.platformer,
        isDemon: !!json.demon,
        demonDifficulty: 0,
        downloads: Number(json.downloads || 0),
        likes: Number(json.likes || 0),
        description: json.description || '',
        youtube: json.video || json.youtube || null,
        video: json.video || json.youtube || null,
      };
      levelCache.set(gdLevelId, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
      return data;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Gom nhiều Level ID vào 1 HTTP Request duy nhất (type=10)
 * Giúp các Job quét danh sách nhanh gấp 10-16 lần và giảm tối đa tải mạng.
 */
export async function fetchGdLevelsBatch(gdLevelIds: number[]): Promise<Map<number, NormalizedGdLevel>> {
  const result = new Map<number, NormalizedGdLevel>();
  const validIds = Array.from(new Set(gdLevelIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (validIds.length === 0) return result;

  // Lấy những level đã có sẵn trong cache
  const missingIds: number[] = [];
  for (const id of validIds) {
    const cached = levelCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      result.set(id, cached.data);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return result;

  // Chia thành từng cụm tối đa 50 ID để gửi lên Boomlings
  for (let i = 0; i < missingIds.length; i += 50) {
    const chunk = missingIds.slice(i, i + 50);
    try {
      const raw = await fetchBoomlingsRaw('getGJLevels21.php', {
        str: chunk.join(','),
        type: 10, // type 10 = danh sách ID cách nhau bởi dấu phẩy
      });

      if (!raw || raw === '-1') continue;

      const [levelsPart, creatorsPart] = raw.split('#');
      if (!levelsPart) continue;

      // Xây map tác giả: playerID -> creatorName
      const creatorsMap = new Map<string, string>();
      if (creatorsPart) {
        for (const c of creatorsPart.split('|')) {
          const [pId, cName] = c.split(':');
          if (pId && cName) creatorsMap.set(pId, cName);
        }
      }

      for (const item of levelsPart.split('|')) {
        const lvl = parseRobTopMap(item);
        const id = Number(lvl['1']);
        if (!id) continue;
        const creatorName = creatorsMap.get(lvl['6']) || 'Unknown';
        const data = normalizeRawLevel(lvl, creatorName);
        levelCache.set(id, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
        result.set(id, data);
      }
    } catch (err) {
      console.warn('[boomlings] fetchGdLevelsBatch chunk failed:', err);
      // Fallback: fetch từng cái nếu cần
      if (ENABLE_GDBROWSER_FALLBACK) {
        for (const singleId of chunk) {
          if (!result.has(singleId)) {
            const single = await fetchGdLevel(singleId);
            if (single) result.set(singleId, single);
          }
        }
      }
    }
  }

  return result;
}

// ==========================================
// 5. Public API: Profile Fetcher
// ==========================================

export async function fetchGdProfile(username: string): Promise<NormalizedGdProfile | null> {
  const cleanUser = username.trim();
  if (!cleanUser) return null;
  const userKey = cleanUser.toLowerCase();

  // 1. Thử gọi trực tiếp Boomlings
  try {
    let accountId: number | null = null;
    const cachedAcc = accountIdCache.get(userKey);
    if (cachedAcc && cachedAcc.expiresAt > Date.now()) {
      accountId = cachedAcc.accountId;
    }

    // Nếu chưa có accountID trong cache: gọi getGJUsers20.php để tìm
    if (!accountId) {
      const searchRaw = await fetchBoomlingsRaw('getGJUsers20.php', { str: cleanUser });
      if (searchRaw && searchRaw !== '-1') {
        const listStr = searchRaw.split('#')[0];
        for (const item of listStr.split('|')) {
          const parsed = parseRobTopMap(item);
          if (parsed['1']?.toLowerCase() === userKey) {
            const foundAcc = Number(parsed['16'] || 0);
            if (foundAcc > 0) {
              accountId = foundAcc;
              accountIdCache.set(userKey, { accountId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
              break;
            }
          }
        }
      }
    }

    // Nếu đã có accountID: gọi getGJUserInfo20.php để lấy toàn bộ thông số chuẩn
    if (accountId) {
      const infoRaw = await fetchBoomlingsRaw('getGJUserInfo20.php', { targetAccountID: accountId });
      if (infoRaw && infoRaw !== '-1') {
        const data = parseRobTopMap(infoRaw);

        // Đảm bảo đúng username
        if (data['1']?.toLowerCase() === userKey) {
          const rawRank = Number(data['30'] || 0);
          const hasGlobalRank = !isNaN(rawRank) && rawRank >= 1;

          return {
            username: data['1'],
            playerId: Number(data['2'] || 0),
            accountId,
            stars: Number(data['3'] || 0),
            moons: Number(data['52'] || 0),
            demons: Number(data['4'] || 0),
            diamonds: Number(data['46'] || 0),
            secretCoins: Number(data['13'] || 0),
            userCoins: Number(data['17'] || 0),
            cp: Number(data['8'] || 0),
            rank: rawRank,
            hasGlobalRank,
            youtube: data['20'] || undefined,
            twitter: data['44'] || undefined,
            twitch: data['45'] || undefined,
            discord: data['59'] || undefined,
            demonBreakdown: data['55'] ? data['55'].split(',').map(Number) : undefined,
          };
        } else {
          // Username không khớp nữa (người dùng đổi tên): xóa cache accountId
          accountIdCache.delete(userKey);
        }
      }
    }
  } catch (err) {
    if (!ENABLE_GDBROWSER_FALLBACK) {
      console.warn(`[boomlings] fetchGdProfile failed for ${cleanUser}:`, err);
      return null;
    }
  }

  // 2. Fallback sang GDBrowser nếu được bật
  if (ENABLE_GDBROWSER_FALLBACK) {
    try {
      const res = await fetch(`https://gdbrowser.com/api/profile/${encodeURIComponent(cleanUser)}`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'GDVN-Web/2.0' },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object') return null;

      const rawRank = data.rank !== undefined && data.rank !== null ? parseInt(String(data.rank), 10) : 0;
      const hasGlobalRank = !isNaN(rawRank) && rawRank >= 1;

      return {
        username: data.username || cleanUser,
        playerId: Number(data.playerID || 0),
        accountId: Number(data.accountID || 0),
        stars: Math.max(0, parseInt(data.stars, 10) || 0),
        moons: Math.max(0, parseInt(data.moons, 10) || 0),
        demons: Math.max(0, parseInt(data.demons, 10) || 0),
        diamonds: Math.max(0, parseInt(data.diamonds, 10) || 0),
        secretCoins: Math.max(0, parseInt(data.coins, 10) || 0),
        userCoins: Math.max(0, parseInt(data.userCoins, 10) || 0),
        cp: data.cp !== undefined ? Math.max(0, parseInt(data.cp, 10) || 0) : 0,
        rank: rawRank,
        hasGlobalRank,
        youtube: data.youtube || undefined,
        twitter: data.twitter || undefined,
        twitch: data.twitch || undefined,
      };
    } catch {
      return null;
    }
  }

  return null;
}
