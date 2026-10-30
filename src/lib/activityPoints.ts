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
  const yesterdayVn = getVnYesterdayString(nowMs);

  let baselineStars: number;
  let baselineMoons: number;
  let baselineDemons: number;

  if (userState.activityDate === todayVn) {
    // Đã vào profile trước đó trong ngày hôm nay: giữ nguyên baseline ngày hôm trước
    baselineStars = userState.activityPrevStars ?? userState.gdStars ?? currentStats.stars;
    baselineMoons = userState.activityPrevMoons ?? userState.gdMoons ?? currentStats.moons;
    baselineDemons = userState.activityPrevDemons ?? userState.gdDemons ?? currentStats.demons;
  } else if (userState.activityDate === yesterdayVn) {
    // Ngày mới liên tiếp (hôm qua có hoạt động/đồng bộ):
    // Chỉ số chốt sổ của ngày hôm qua chính là baseline để tính điểm tăng trưởng cho hôm nay
    baselineStars = userState.gdStars ?? currentStats.stars;
    baselineMoons = userState.gdMoons ?? currentStats.moons;
    baselineDemons = userState.gdDemons ?? currentStats.demons;
  } else {
    // Lần đầu vào hoặc không hoạt động hôm qua (bỏ lỡ >= 1 ngày, hoặc thành viên mới):
    // Thiết lập baseline bằng đúng chỉ số hiện tại để KHÔNG bị cộng dồn stats cũ của nhiều ngày/tuần trước
    baselineStars = currentStats.stars;
    baselineMoons = currentStats.moons;
    baselineDemons = currentStats.demons;
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
