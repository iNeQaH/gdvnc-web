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

  const hasPreviousBaseline =
    Boolean(userState.activityPrevStars && userState.activityPrevStars > 0) ||
    Boolean(userState.gdStars && userState.gdStars > 0);

  if (!hasPreviousBaseline && (currentStats.stars > 0 || currentStats.moons > 0 || currentStats.demons > 0)) {
    // Trường hợp 1: Tài khoản mới xác minh / lần đầu nhận stats từ Geometry Dash:
    // Toàn bộ stats là lifetime history, baseline = currentStats, điểm hoạt động tuần = 0.
    baselineStars = currentStats.stars;
    baselineMoons = currentStats.moons;
    baselineDemons = currentStats.demons;
  } else if (userState.activityDate === currentWeekVn) {
    // Trường hợp 2: Đang trong tuần hiện tại:
    // Giữ nguyên baseline đã lưu từ đầu tuần để tích lũy điểm tăng trưởng trong suốt cả tuần.
    const prevS =
      typeof userState.activityPrevStars === 'number' && userState.activityPrevStars >= 0
        ? userState.activityPrevStars
        : typeof userState.gdStars === 'number' && userState.gdStars >= 0
        ? userState.gdStars
        : currentStats.stars;
    const prevM =
      typeof userState.activityPrevMoons === 'number' && userState.activityPrevMoons >= 0
        ? userState.activityPrevMoons
        : typeof userState.gdMoons === 'number' && userState.gdMoons >= 0
        ? userState.gdMoons
        : currentStats.moons;
    const prevD =
      typeof userState.activityPrevDemons === 'number' && userState.activityPrevDemons >= 0
        ? userState.activityPrevDemons
        : typeof userState.gdDemons === 'number' && userState.gdDemons >= 0
        ? userState.gdDemons
        : currentStats.demons;

    baselineStars = prevS;
    baselineMoons = prevM;
    baselineDemons = prevD;
  } else if (userState.activityDate === prevWeekVn) {
    // Trường hợp 3: Tuần mới liền kề (tuần trước có hoạt động):
    // Chỉ số chốt sổ cuối tuần trước (gdStars cũ trong DB) chính là baseline cho tuần mới.
    const prevS =
      typeof userState.gdStars === 'number' && userState.gdStars >= 0
        ? userState.gdStars
        : currentStats.stars;
    const prevM =
      typeof userState.gdMoons === 'number' && userState.gdMoons >= 0
        ? userState.gdMoons
        : currentStats.moons;
    const prevD =
      typeof userState.gdDemons === 'number' && userState.gdDemons >= 0
        ? userState.gdDemons
        : currentStats.demons;

    baselineStars = prevS;
    baselineMoons = prevM;
    baselineDemons = prevD;
  } else {
    // Trường hợp 4: Tuần mới sau thời gian vắng mặt (hoặc chuyển đổi format):
    // Ưu tiên lấy chỉ số cuối cùng đã lưu trong DB (gdStars) làm baseline,
    // để bất kỳ stars/demons nào người chơi cày thêm từ lần sync trước đều được tính điểm tuần!
    const prevS =
      typeof userState.gdStars === 'number' && userState.gdStars >= 0
        ? userState.gdStars
        : currentStats.stars;
    const prevM =
      typeof userState.gdMoons === 'number' && userState.gdMoons >= 0
        ? userState.gdMoons
        : currentStats.moons;
    const prevD =
      typeof userState.gdDemons === 'number' && userState.gdDemons >= 0
        ? userState.gdDemons
        : currentStats.demons;

    baselineStars = prevS;
    baselineMoons = prevM;
    baselineDemons = prevD;
  }

  let deltaStars = Math.max(0, currentStats.stars - baselineStars);
  let deltaMoons = Math.max(0, currentStats.moons - baselineMoons);
  let deltaDemons = Math.max(0, currentStats.demons - baselineDemons);

  // Safeguard: Phát hiện và triệt tiêu bước nhảy đột biến bất thường trong 1 tuần
  // (ví dụ: đổi tên tài khoản GD, gắn nick mới, hoặc gian lận stats)
  if (deltaStars > 2500 || deltaMoons > 1500 || deltaDemons > 200) {
    baselineStars = currentStats.stars;
    baselineMoons = currentStats.moons;
    baselineDemons = currentStats.demons;
    deltaStars = 0;
    deltaMoons = 0;
    deltaDemons = 0;
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
