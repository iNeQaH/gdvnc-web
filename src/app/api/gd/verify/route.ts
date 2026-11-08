import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { isBrowserSameOriginFetch } from '@/lib/origin';
import { publicApiError } from '@/lib/apiError';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { fetchGdProfile } from '@/lib/boomlings';
import { checkAndAwardGrinderBadges } from '@/lib/gdBrowserSync';
import { getVnWeekString } from '@/lib/activityPoints';
import { claimLegacyRecords } from '@/lib/claimLegacyRecords';
import { autoLinkUserCreatedLevels } from '@/lib/creatorLevelsSync';
import { recalculateCreatorPoints } from '@/lib/recalculateCreatorPoints';
import { clearLeaderboardCache } from '@/lib/leaderboard';
import { jwtSecretBytes } from '@/lib/secrets';
import { playgroundManager } from '@/lib/playground';

const TOKEN_REGEX = /^GDVN-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
const GD_USERNAME_REGEX = /^[a-zA-Z0-9 _-]{1,32}$/;

function generateCustomToken(): string {
  // Sinh token dạng GDVN-XXXX-XXXX bằng các ký tự dễ nhìn, tránh 0/O, 1/I
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars[bytes[i] % chars.length];
    p2 += chars[bytes[i + 4] % chars.length];
  }
  return `GDVN-${p1}-${p2}`;
}

function signVerifySession(payload: {
  userId: string;
  accountId: number;
  gdUsername: string;
  token: string;
  expiresAt: number;
}): string {
  const data = `${payload.userId}:${payload.accountId}:${payload.gdUsername.trim().toLowerCase()}:${payload.token}:${payload.expiresAt}`;
  return crypto.createHmac('sha256', jwtSecretBytes()).update(data).digest('hex');
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  if (!isBrowserSameOriginFetch(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let authUser: any;
  try {
    authUser = await requireActiveUser();
  } catch {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để thực hiện xác minh.' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action; // 'generate' | 'check'

    const userId = authUser.userId || authUser.id;
    if (!userId) {
      return NextResponse.json({ error: 'Không tìm thấy ID người dùng.' }, { status: 401 });
    }

    if (action === 'generate') {
      const rl = rateLimit(`gd_verify_gen:${userId}:${ip}`, 10, 15 * 60 * 1000);
      if (!rl.ok) {
        return rateLimitResponse(rl.retryAfterSec, 'Bạn đã yêu cầu tạo mã quá nhiều lần. Vui lòng thử lại sau.');
      }

      const rawGdUsername = typeof body?.gdUsername === 'string' ? body.gdUsername.trim() : '';
      if (!rawGdUsername) {
        return NextResponse.json({ error: 'Vui lòng nhập tên tài khoản Geometry Dash.' }, { status: 400 });
      }
      if (!GD_USERNAME_REGEX.test(rawGdUsername)) {
        return NextResponse.json({ error: 'Tên tài khoản Geometry Dash không hợp lệ (chỉ gồm chữ, số, dấu cách, gạch ngang/dưới, tối đa 32 ký tự).' }, { status: 400 });
      }

      // 1. Kiểm tra tài khoản GD này đã có ai xác minh trên web chưa
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: userId },
          gdVerified: true,
          gdUsername: { equals: rawGdUsername, mode: 'insensitive' },
        },
        select: { username: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Tên Geometry Dash "${rawGdUsername}" đã được xác minh bởi tài khoản ${conflict.username}.` },
          { status: 409 }
        );
      }

      // 2. Tra cứu trên Boomlings xem tài khoản GD có thực sự tồn tại không
      const gdProfile = await fetchGdProfile(rawGdUsername, true);
      if (!gdProfile || !gdProfile.accountId) {
        return NextResponse.json(
          { error: `Không tìm thấy tài khoản Geometry Dash "${rawGdUsername}" trên máy chủ game.` },
          { status: 404 }
        );
      }

      // Kiểm tra xung đột lần nữa theo tên chuẩn từ Boomlings
      if (gdProfile.username.toLowerCase() !== rawGdUsername.toLowerCase()) {
        const canonicalConflict = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            gdVerified: true,
            gdUsername: { equals: gdProfile.username, mode: 'insensitive' },
          },
          select: { username: true },
        });
        if (canonicalConflict) {
          return NextResponse.json(
            { error: `Tên Geometry Dash "${gdProfile.username}" đã được xác minh bởi tài khoản ${canonicalConflict.username}.` },
            { status: 409 }
          );
        }
      }

      // 3. Sinh token mới kèm chữ ký HMAC-SHA256 chống giả mạo và lưu vào profileConfig
      const token = generateCustomToken();
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 phút
      const sig = signVerifySession({
        userId,
        accountId: gdProfile.accountId,
        gdUsername: gdProfile.username,
        token,
        expiresAt,
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileConfig: true },
      });
      const currentConfig = (user?.profileConfig as Record<string, any>) || {};
      const newConfig = {
        ...currentConfig,
        gdVerifySession: {
          token,
          gdUsername: gdProfile.username,
          accountId: gdProfile.accountId,
          expiresAt,
          sig,
        },
      };

      await prisma.user.update({
        where: { id: userId },
        data: { profileConfig: newConfig },
      });

      return NextResponse.json({
        success: true,
        token,
        gdUsername: gdProfile.username,
        accountId: gdProfile.accountId,
        expiresAt,
      });
    }

    if (action === 'check') {
      const rl = rateLimit(`gd_verify_chk:${userId}:${ip}`, 8, 60 * 1000);
      if (!rl.ok) {
        return rateLimitResponse(rl.retryAfterSec, 'Vui lòng chờ ít giây trước khi bấm kiểm tra lại.');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, profileConfig: true, gdVerified: true, gdUsername: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
      }

      const session = (user.profileConfig as Record<string, any>)?.gdVerifySession;
      if (
        !session ||
        typeof session.token !== 'string' ||
        typeof session.gdUsername !== 'string' ||
        typeof session.accountId !== 'number' ||
        typeof session.expiresAt !== 'number' ||
        typeof session.sig !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Chưa có phiên xác minh hợp lệ. Vui lòng bấm lấy mã mới.' },
          { status: 400 }
        );
      }

      if (Date.now() > session.expiresAt) {
        return NextResponse.json(
          { error: 'Mã xác minh đã hết hạn (30 phút). Vui lòng tạo mã mới.' },
          { status: 400 }
        );
      }

      const expectedToken = session.token.trim().toUpperCase();
      if (!TOKEN_REGEX.test(expectedToken)) {
        return NextResponse.json(
          { error: 'Định dạng mã xác minh không hợp lệ. Vui lòng tạo mã mới.' },
          { status: 400 }
        );
      }

      // Kiểm tra chữ ký HMAC-SHA256 chống giả mạo session từ phía client
      const expectedSig = signVerifySession({
        userId: user.id,
        accountId: session.accountId,
        gdUsername: session.gdUsername,
        token: expectedToken,
        expiresAt: session.expiresAt,
      });
      if (!safeEqualStrings(session.sig, expectedSig)) {
        return NextResponse.json(
          { error: 'Phiên xác minh không hợp lệ. Vui lòng tạo mã mới.' },
          { status: 400 }
        );
      }

      // Kiểm tra xung đột trước khi verify
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: user.id },
          gdVerified: true,
          gdUsername: { equals: session.gdUsername, mode: 'insensitive' },
        },
        select: { username: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Tên GD "${session.gdUsername}" đã được xác minh bởi tài khoản ${conflict.username}.` },
          { status: 409 }
        );
      }

      // Gọi getGJUserInfo20 trực tiếp để đọc Key 61 (customToken)
      const gdProfile = await fetchGdProfile(session.gdUsername, true);
      if (!gdProfile || gdProfile.accountId !== session.accountId) {
        return NextResponse.json(
          { error: 'Không thể kết nối đến máy chủ Geometry Dash để kiểm tra. Vui lòng thử lại sau vài giây.' },
          { status: 502 }
        );
      }

      // ĐỐI CHIẾU DUY NHẤT VỚI TRƯỜNG CUSTOM (Key 61) BẰNG TIMING-SAFE EQUAL
      // Tuyệt đối không in giá trị actualCustomToken ra thông báo lỗi để tránh lộ token của dịch vụ khác (Argon/Globed)
      const actualCustomToken = gdProfile.customToken?.trim().toUpperCase() || '';

      if (!actualCustomToken || !safeEqualStrings(actualCustomToken, expectedToken)) {
        return NextResponse.json({
          success: false,
          verified: false,
          error: actualCustomToken
            ? `Mã trong ô "Custom:" của tài khoản "${session.gdUsername}" chưa khớp với mã yêu cầu "${expectedToken}". Vui lòng dán đúng mã và bấm Update trong game.`
            : `Chưa tìm thấy mã trong ô "Custom:" của tài khoản "${session.gdUsername}". Bạn đã dán mã và bấm Update trong game chưa?`,
        }, { status: 400 });
      }

      // KHỚP MÃ THÀNH CÔNG -> KÍCH HOẠT QUY TRÌNH HẬU XÁC MINH TOÀN DIỆN
      const updatedConfig = { ...((user.profileConfig as Record<string, any>) || {}) };
      delete updatedConfig.gdVerifySession;

      // 1. Đồng bộ stats từ Boomlings
      const syncedStars = gdProfile.hasGlobalRank ? Math.max(0, gdProfile.stars || 0) : 0;
      const syncedMoons = gdProfile.hasGlobalRank ? Math.max(0, gdProfile.moons || 0) : 0;
      const syncedDemons = gdProfile.hasGlobalRank ? Math.max(0, gdProfile.demons || 0) : 0;
      const syncedCp = Math.max(0, gdProfile.cp || 0);

      // 2. Cập nhật User trong DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          gdUsername: gdProfile.username,
          gdVerified: true,
          gdStars: syncedStars,
          gdMoons: syncedMoons,
          gdDemons: syncedDemons,
          creatorPoints: syncedCp,
          gdHasGlobalRank: gdProfile.hasGlobalRank,
          gdStatsUpdatedAt: new Date(),
          ...(gdProfile.iconSet ? { gdIconSet: gdProfile.iconSet as any } : {}),
          profileConfig: updatedConfig,
          // Chốt baseline hoạt động tuần sạch, không để chênh lệch quá khứ tính thành điểm tuần này
          activityPoints: 0,
          activityDate: getVnWeekString(),
          activityPrevStars: syncedStars,
          activityPrevMoons: syncedMoons,
          activityPrevDemons: syncedDemons,
        },
      });

      if (gdProfile.iconSet) {
        try {
          playgroundManager.updatePlayerIconSet(user.id, gdProfile.iconSet);
        } catch {
          /* ignore */
        }
      }

      if (gdProfile.hasGlobalRank) {
        await checkAndAwardGrinderBadges(user.id, syncedStars, syncedMoons, syncedDemons).catch(() => {});
      }

      // 3. Tự động gắn các kỷ lục cũ của GD username này vào tài khoản
      const { claimed } = await claimLegacyRecords(user.id, gdProfile.username);

      // 4. Tự động liên kết các level đã tạo và xét lại huy hiệu Creator
      await autoLinkUserCreatedLevels(user.id, gdProfile.username, user.username).catch(() => {});
      await recalculateCreatorPoints(user.id).catch(() => {});

      clearLeaderboardCache();

      return NextResponse.json({
        success: true,
        verified: true,
        gdUsername: gdProfile.username,
        claimed,
        stats: {
          stars: syncedStars,
          moons: syncedMoons,
          demons: syncedDemons,
          cp: syncedCp,
          hasGlobalRank: gdProfile.hasGlobalRank,
          iconSet: gdProfile.iconSet,
        },
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ.' }, { status: 400 });
  } catch (err: any) {
    return publicApiError(err, 'Lỗi xử lý xác minh Geometry Dash.', 500);
  }
}
