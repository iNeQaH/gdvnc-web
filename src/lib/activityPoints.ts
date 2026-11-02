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

  const hasPreviousBaseline =
    Boolean(userState.activityPrevStars && userState.activityPrevStars > 0) ||
    Boolean(userState.gdStars && userState.gdStars > 0);

  if (!hasPreviousBaseline && (currentStats.stars > 0 || currentStats.moons > 0 || currentStats.demons > 0)) {
    // Trường hợp 1: Tài khoản mới xác minh / lần đầu nhận stats từ Geometry Dash (chưa từng có baseline > 0):
    // Toàn bộ stars, moons, demons nhận về là chỉ số quá khứ (lifetime), KHÔNG PHẢI điểm cày hôm nay.
    // Thiết lập baseline bằng đúng currentStats, điểm hoạt động hôm nay = 0.
    baselineStars = currentStats.stars;
    baselineMoons = currentStats.moons;
    baselineDemons = currentStats.demons;
  } else if (userState.activityDate === todayVn) {
    // Trường hợp 2: Đã vào profile hoặc đã chốt baseline trước đó trong ngày hôm nay:
    // Lấy baseline đã lưu. Nếu baseline cũ bằng 0 mà currentStats > 0 thì chốt bằng currentStats.
    const prevS = (userState.activityPrevStars && userState.activityPrevStars > 0)
      ? userState.activityPrevStars
      : ((userState.gdStars && userState.gdStars > 0) ? userState.gdStars : currentStats.stars);
    const prevM = (userState.activityPrevMoons && userState.activityPrevMoons > 0)
      ? userState.activityPrevMoons
      : ((userState.gdMoons && userState.gdMoons > 0) ? userState.gdMoons : currentStats.moons);
    const prevD = (userState.activityPrevDemons && userState.activityPrevDemons > 0)
      ? userState.activityPrevDemons
      : ((userState.gdDemons && userState.gdDemons > 0) ? userState.gdDemons : currentStats.demons);

    baselineStars = prevS;
    baselineMoons = prevM;
    baselineDemons = prevD;
  } else if (userState.activityDate === yesterdayVn) {
    // Trường hợp 3: Ngày mới liên tiếp (hôm qua có hoạt động/đồng bộ):
    // Chỉ số chốt sổ của ngày hôm qua chính là baseline để tính điểm tăng trưởng cho hôm nay.
    const prevS = (userState.gdStars && userState.gdStars > 0) ? userState.gdStars : currentStats.stars;
    const prevM = (userState.gdMoons && userState.gdMoons > 0) ? userState.gdMoons : currentStats.moons;
    const prevD = (userState.gdDemons && userState.gdDemons > 0) ? userState.gdDemons : currentStats.demons;

    baselineStars = prevS;
    baselineMoons = prevM;
    baselineDemons = prevD;
  } else {
    // Trường hợp 4: Lần đầu vào hoặc không hoạt động hôm qua (bỏ lỡ >= 1 ngày, hoặc thành viên mới):
    // Thiết lập baseline bằng đúng chỉ số hiện tại để KHÔNG bị cộng dồn stats cũ của nhiều ngày/tuần trước.
    baselineStars = currentStats.stars;
    baselineMoons = currentStats.moons;
    baselineDemons = currentStats.demons;
  }

  let deltaStars = Math.max(0, currentStats.stars - baselineStars);
  let deltaMoons = Math.max(0, currentStats.moons - baselineMoons);
  let deltaDemons = Math.max(0, currentStats.demons - baselineDemons);

  // Safeguard: Phát hiện và triệt tiêu bước nhảy đột biến bất thường
  // (ví dụ: đổi tên tài khoản GD, gắn nick mới, hoặc sync sau khi admin duyệt verify).
  // Không ai cày được > 500 stars, > 300 moons hoặc > 50 demons trong một ngày.
  if (deltaStars > 500 || deltaMoons > 300 || deltaDemons > 50) {
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
    activityDate: todayVn,
    activityPrevStars: baselineStars,
    activityPrevMoons: baselineMoons,
    activityPrevDemons: baselineDemons,
    deltaStars,
    deltaMoons,
    deltaDemons,
  };
}
