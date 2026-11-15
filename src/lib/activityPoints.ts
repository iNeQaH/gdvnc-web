/**
 * activityPoints.ts
 *
 * Quản lý cơ chế tính Điểm Hoạt Động Clan (theo TUẦN):
 * - Chu kỳ tuần: Thứ Hai (00:00:00) đến Chủ Nhật (23:59:59) theo múi giờ Việt Nam (UTC+7).
 * - Định danh tuần: YYYY-Www (theo chuẩn ISO 8601, ví dụ "2026-W45").
 * - So sánh tổng số Star, Moon, Demon hiện tại với baseline đầu tuần của người chơi.
 * - Mỗi Star cao hơn: +1 điểm.
 * - Mỗi Moon cao hơn: +1 điểm.
 * - Mỗi Demon cao hơn: +10 điểm.
 * - Nếu điểm thấp hơn hoặc bằng: 0 điểm (không tính).
 * - Nhảy từ 0 lên số khác 0 (lần đầu đồng bộ stat) không tính điểm tuần, chốt baseline bằng stat hiện tại; các lần đồng bộ sau đó sẽ tính bình thường.
 * - Điểm chỉ được cập nhật khi người dùng xem profile của chính mình.
 */

/**
 * Trả về chuỗi tuần hiện tại theo múi giờ Việt Nam (UTC+7), reset lúc 07:00 sáng Thứ Hai: "YYYY-Www"
 * Do 07:00:00 Thứ Hai tại Việt Nam (UTC+7) chính xác là 00:00:00 Thứ Hai theo chuẩn UTC,
 * việc tính toán tuần ISO 8601 trực tiếp trên timestamp UTC (nowMs)
 * sẽ tự động chốt tuần cũ và mở tuần mới chuẩn xác vào lúc 07:00:00 sáng Thứ Hai VN.
 */
export function getVnWeekString(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const dayNum = d.getUTCDay() || 7; // Sunday is 7, Monday is 1
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Trả về chuỗi tuần trước liền kề theo múi giờ Việt Nam (UTC+7): "YYYY-Www"
 */
export function getVnPreviousWeekString(nowMs: number = Date.now()): string {
  return getVnWeekString(nowMs - 7 * 24 * 3600_000);
}

/**
 * Trả về chuỗi ngày hôm nay theo múi giờ Việt Nam (UTC+7): "YYYY-MM-DD"
 */
export function getVnTodayString(nowMs: number = Date.now()): string {
  const vnMs = nowMs + 7 * 3600_000;
  const vnDate = new Date(vnMs);
  const yyyy = vnDate.getUTCFullYear();
  const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Trả về chuỗi ngày hôm qua theo múi giờ Việt Nam (UTC+7): "YYYY-MM-DD"
 */
export function getVnYesterdayString(nowMs: number = Date.now()): string {
  const vnMs = nowMs + 7 * 3600_000 - 24 * 3600_000;
  const vnDate = new Date(vnMs);
  const yyyy = vnDate.getUTCFullYear();
  const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface ActivityPointsResult {
  activityPoints: number;
  activityDate: string;
  activityPrevStars: number;
  activityPrevMoons: number;
  activityPrevDemons: number;
  deltaStars: number;
  deltaMoons: number;
  deltaDemons: number;
}

/**
 * Tính toán điểm hoạt động theo tuần cho người dùng khi xem Profile của bản thân:
 * @param currentStats Chỉ số hiện tại (từ Boomlings/GD)
 * @param userState Trạng thái cũ trong DB của người dùng (trước khi ghi đè chỉ số mới)
 */
export function computeActivityPoints(
  currentStats: { stars: number; moons: number; demons: number },
  userState: {
    activityDate?: string | null;
    activityPoints?: number;
    activityPrevStars?: number;
    activityPrevMoons?: number;
    activityPrevDemons?: number;
    gdStars?: number;
    gdMoons?: number;
    gdDemons?: number;
  },
  nowMs: number = Date.now()
): ActivityPointsResult {
  const currentWeekVn = getVnWeekString(nowMs);
  const prevWeekVn = getVnPreviousWeekString(nowMs);

  let baselineStars: number;
  let baselineMoons: number;
  let baselineDemons: number;

  if (userState.activityDate === currentWeekVn) {
    // Trường hợp đang trong tuần hiện tại: giữ nguyên baseline đã lưu từ đầu tuần
    baselineStars =
      typeof userState.activityPrevStars === 'number' && userState.activityPrevStars >= 0
        ? userState.activityPrevStars
        : typeof userState.gdStars === 'number' && userState.gdStars >= 0
        ? userState.gdStars
        : 0;
    baselineMoons =
      typeof userState.activityPrevMoons === 'number' && userState.activityPrevMoons >= 0
        ? userState.activityPrevMoons
        : typeof userState.gdMoons === 'number' && userState.gdMoons >= 0
        ? userState.gdMoons
        : 0;
    baselineDemons =
      typeof userState.activityPrevDemons === 'number' && userState.activityPrevDemons >= 0
        ? userState.activityPrevDemons
        : typeof userState.gdDemons === 'number' && userState.gdDemons >= 0
        ? userState.gdDemons
        : 0;
  } else {
    // Trường hợp tuần mới: lấy chỉ số cuối cùng đã lưu trong DB (gdStars cũ) làm baseline tuần mới
    baselineStars =
      typeof userState.gdStars === 'number' && userState.gdStars >= 0
        ? userState.gdStars
        : 0;
    baselineMoons =
      typeof userState.gdMoons === 'number' && userState.gdMoons >= 0
        ? userState.gdMoons
        : 0;
    baselineDemons =
      typeof userState.gdDemons === 'number' && userState.gdDemons >= 0
        ? userState.gdDemons
        : 0;
  }

  // Quy tắc nghiệp vụ: Miễn là từ 0 lên số khác 0 thì không tính điểm tuần (lần đầu đồng bộ stat),
  // chốt baseline bằng stat hiện tại để lần đồng bộ sau đó sẽ bắt đầu tính điểm.
  let deltaStars = 0;
  if (baselineStars <= 0 && currentStats.stars > 0) {
    baselineStars = currentStats.stars;
    deltaStars = 0;
  } else if (baselineStars > 0) {
    deltaStars = Math.max(0, currentStats.stars - baselineStars);
  }

  let deltaMoons = 0;
  if (baselineMoons <= 0 && currentStats.moons > 0) {
    baselineMoons = currentStats.moons;
    deltaMoons = 0;
  } else if (baselineMoons > 0) {
    deltaMoons = Math.max(0, currentStats.moons - baselineMoons);
  }

  let deltaDemons = 0;
  if (baselineDemons <= 0 && currentStats.demons > 0) {
    baselineDemons = currentStats.demons;
    deltaDemons = 0;
  } else if (baselineDemons > 0) {
    deltaDemons = Math.max(0, currentStats.demons - baselineDemons);
  }

  const points = deltaStars * 1 + deltaMoons * 1 + deltaDemons * 10;

  return {
    activityPoints: points,
    activityDate: currentWeekVn,
    activityPrevStars: baselineStars,
    activityPrevMoons: baselineMoons,
    activityPrevDemons: baselineDemons,
    deltaStars,
    deltaMoons,
    deltaDemons,
  };
}
