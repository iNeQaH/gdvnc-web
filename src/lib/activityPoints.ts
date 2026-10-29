/**
 * activityPoints.ts
 *
 * Quản lý cơ chế tính Điểm Hoạt Động Clan:
 * - So sánh tổng số Star, Moon, Demon ngày hôm nay với ngày hôm trước của từng người chơi.
 * - Mỗi Star cao hơn: +1 điểm.
 * - Mỗi Moon cao hơn: +1 điểm.
 * - Mỗi Demon cao hơn: +10 điểm.
 * - Nếu điểm thấp hơn hoặc bằng: 0 điểm (không tính).
 * - Điểm chỉ được cập nhật khi người dùng xem profile của chính mình.
 */

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
 * Tính toán điểm hoạt động cho người dùng khi xem Profile của bản thân:
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
  const todayVn = getVnTodayString(nowMs);

  let baselineStars: number;
  let baselineMoons: number;
  let baselineDemons: number;

  if (userState.activityDate === todayVn) {
    // Đã vào profile trước đó trong ngày hôm nay: giữ nguyên baseline ngày hôm trước
    baselineStars = userState.activityPrevStars ?? userState.gdStars ?? 0;
    baselineMoons = userState.activityPrevMoons ?? userState.gdMoons ?? 0;
    baselineDemons = userState.activityPrevDemons ?? userState.gdDemons ?? 0;
  } else {
    // Lần đầu vào trong ngày mới:
    // Nếu user chưa từng có stats (khởi tạo lần đầu): baseline chính là currentStats để không bị nhảy điểm đột biến
    const hasExistingStats = (userState.gdStars ?? 0) > 0 || (userState.activityPrevStars ?? 0) > 0;
    if (!hasExistingStats && (currentStats.stars > 0 || currentStats.moons > 0 || currentStats.demons > 0)) {
      baselineStars = currentStats.stars;
      baselineMoons = currentStats.moons;
      baselineDemons = currentStats.demons;
    } else {
      // Các chỉ số đang lưu trong DB chính là chốt sổ của ngày hôm trước
      baselineStars = userState.gdStars ?? 0;
      baselineMoons = userState.gdMoons ?? 0;
      baselineDemons = userState.gdDemons ?? 0;
    }
  }

  const deltaStars = Math.max(0, currentStats.stars - baselineStars);
  const deltaMoons = Math.max(0, currentStats.moons - baselineMoons);
  const deltaDemons = Math.max(0, currentStats.demons - baselineDemons);

  const points = deltaStars * 1 + deltaMoons * 1 + deltaDemons * 10;

  return {
    activityPoints: points,
    activityDate: todayVn,
    activityPrevStars: baselineStars,
    activityPrevMoons: baselineMoons,
    activityPrevDemons: baselineDemons,
    deltaStars,
    deltaMoons,
    deltaDemons,
  };
}
