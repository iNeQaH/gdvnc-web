# GDVN (gdvnc-web) — AI Master Codebase Index & Security Architecture
> **Bản đồ cấu trúc toàn diện, kiểm tra bảo mật, tối ưu mã nguồn & bảng tra cứu sửa bug tức thì dành riêng cho AI Agent & Kỹ sư phát triển.**
> **Không cần đọc lại toàn bộ mã nguồn**: Chỉ cần đọc file này là nắm bắt 100% logic, luồng dữ liệu, vị trí xử lý lỗi và các tiêu chuẩn kỹ thuật của hệ thống.

---

## MỤC LỤC
1. [Hướng Dẫn Dành Cho AI Agent (Agent System Instructions)](#1-hướng-dẫn-dành-cho-ai-agent)
2. [Kiến Trúc Tổng Thể & Hạ Tầng Kỹ Thuật (Architecture & Tech Stack)](#2-kiến-trúc-tổng-thể--hạ-tầng-kỹ-thuật)
3. [Mô Hình Cơ Sở Dữ Liệu & Dynamic Schema (Database & Prisma Schema)](#3-mô-hình-cơ-sở-dữ-liệu--dynamic-schema)
4. [Bản Đồ Phân Tích Chi Tiết Từng File Một Trong Hệ Thống (Exhaustive File-by-File Breakdown)](#4-bản-đồ-phân-tích-chi-tiết-từng-file-một-trong-hệ-thống)
   - 4.1. Core Libraries (`src/lib/*.ts`)
   - 4.2. Tất Cả 98 API Endpoints (`src/app/api/**/route.ts`)
   - 4.3. UI Components & Hệ Thống Giao Diện (`src/components/**/*.tsx`)
   - 4.4. App Pages, Layouts & Subroutes (`src/app/**/page.tsx`)
   - 4.5. Scripts, Styles & Hạ Tầng Triển Khai
5. [Bản Đồ Tra Cứu Định Vị & Sửa Lỗi Tức Thì (Instant Bug-Fixing Matrix)](#5-bản-đồ-tra-cứu-định-vị--sửa-lỗi-tức-thì)
6. [Báo Cáo Kiểm Tra Bảo Mật Toàn Diện (Security Audit & Hardening)](#6-báo-cáo-kiểm-tra-bảo-mật-toàn-diện)
7. [Báo Cáo Tối Ưu Hóa Hiệu Năng & Code (Performance & Code Optimization)](#7-báo-cáo-tối-ưu-hóa-hiệu-năng--code)

---

## 1. HƯỚNG DẪN DÀNH CHO AI AGENT

Khi nhận được yêu cầu từ người dùng (fix bug, thêm feature, tối ưu code, kiểm tra logic):
1. **Tra cứu ngay Mục 5 (Instant Bug-Fixing Matrix)** để tìm lỗi/tính năng tương ứng, file cần mở và hàm xử lý chính xác.
2. **Tra cứu Mục 4 (File-by-File Breakdown)** để nắm cấu trúc dữ liệu, các hàm export, phụ thuộc và các bẫy logic (pitfalls/edge cases).
3. **Quy tắc bất di bất dịch của dự án**:
   - **Mã nguồn ứng dụng**: Nằm trong thư mục `gdvnc-web-main/`. Path alias `@/*` trỏ về `gdvnc-web-main/src/*`.
   - **Cổng dev**: Chạy port `8088` (`npm run dev` → `0.0.0.0:8088`), không phải `3000`.
   - **Không tạo/ghi đè**: Tuyệt đối **không** tạo `AGENTS.md` hoặc `CLAUDE.md` bên trong `gdvnc-web-main/` (Next.js sẽ recreate hoặc bị gitignore).
   - **Cập nhật trạng thái**: Sau mỗi lần sửa code, cập nhật `.cursor/PROJECT_STATE.md` (Changelog ngày + các mục liên quan).
   - **Quy trình triển khai**: Triển khai lên VPS Production qua `python deploy.py` (tự động SSH kéo `main`, push schema, build standalone và restart PM2).
   - **Commit & Push GitHub**: Khi xong task, commit và push lên `https://github.com/iNeQaH/gdvnc-web` (nhánh `main`).

---

## 2. KIẾN TRÚC TỔNG THỂ & HẠ TẦNG KỸ THUẬT

### 2.1. Tech Stack
- **Framework**: Next.js 14 App Router (React 18 Server Components & Client Components), TypeScript.
- **ORM & Database**: Prisma ORM, PostgreSQL (Database tự host hoặc cloud), quản lý DDL kép qua `prisma/schema.prisma` và runtime dynamic migration qua `src/lib/ensureSchema.ts`.
- **Xác thực & Phân quyền (Auth & RBAC)**: JWT ký bởi thư viện `jose` (HS256), lưu trữ trong HttpOnly Cookie `gdvnc_token` với thời hạn 7 ngày. Hỗ trợ Session Invalidation tức thì bằng `tokenVersion` trong DB. Phân quyền đa cấp: `USER`, `MODERATOR`, `ADMIN` (Full Admin), và `SUPER_ADMIN` (kiểm tra username/id đặc quyền qua env).
- **Bảo vệ Brute-force & Anti-Bot**: Proof-of-Work (PoW) SHA256 Captcha (`captcha.ts`), Rate limiter in-memory theo IP và identifier (`rateLimit.ts`), Account lockout sau 5 lần đăng nhập sai (`failedLoginAttempts`, `lockedUntil`).
- **Thanh toán & Đổi thưởng (Payment & Rewards)**: Webhook SePay (`/api/webhooks/sepay`) tự động phân tích cú pháp chuyển khoản ngân hàng (VietinBank, Techcombank, VCB...), kích hoạt thời hạn Supporter và cấp SP Coin. Hệ thống mã đổi thưởng (`RedeemCode`, `RedeemCodeUse`).
- **Tích hợp bên thứ ba (External Integrations)**:
  - **GDBrowser API**: Đồng bộ profile GD (`stars`, `moons`, `demons`, `cp`, `globalRank`) từ `https://gdbrowser.com/api/profile/{username}` kèm cơ chế cooldown 5 phút (người có rank) và 72 giờ (người không có rank).
  - **Pointercrate / Demonlist API**: Lấy dữ liệu kỷ lục và media quỷ dữ quốc tế.
  - **Google Sheets API**: Đồng bộ bảng xếp hạng GDVN Classic/Platformer qua Sheet đồng bộ tự động.
- **Hệ thống Theme & Visual Styles**:
  - Gồm 8 theme: `sky`, `mint`, `peach`, `lavender`, `mono`, `sakura`, `custom`, và `glitch` (mang tên bí ẩn `"???"`).
  - Hỗ trợ đổi theme theo scoped container (profile cá nhân không làm ảnh hưởng theme website tổng thể).
  - Thuật toán Luminous HSV (`ensureLuminousGlowColor` trong `UserDisplayName.tsx`): tự động điều chỉnh độ sáng `v >= 0.92` trên nền sáng để ngăn ngừa vệt đen bẩn của glow.
- **Môi trường Triển khai (Deployment Topology)**:
  - VPS Production Linux: IP `103.231.248.235`.
  - Process Manager: PM2 (`gdvn-web`, chạy bản Next.js standalone tại `.next/standalone/server.js`).
  - Cloudflare Tunnel (`cloudflared`): Định tuyến tên miền bảo vệ chống DDoS và giấu IP gốc.

---

## 3. MÔ HÌNH CƠ SỞ DỮ LIỆU & DYNAMIC SCHEMA

### 3.1. Các Bảng Dữ Liệu Cốt Lõi (Core Prisma Models)
1. **`User`**:
   - `id`, `username`, `email`, `passwordHash`, `role` (`ADMIN`, `MODERATOR`, `USER`).
   - Profile: `avatarUrl`, `coverUrl`, `bio`, `discordTag`, `gdUsername`, `gdVerified`, `country`, `profileTheme`, `profileConfig` (Json).
   - Display & Styling: `displayName`, `nameColor`, `nameGradient`, `nameGlow`, `nameFont`, `hasGlitchTheme`.
   - Security: `tokenVersion`, `totpEnabled`, `totpSecret`, `failedLoginAttempts`, `lockedUntil`, `lastFailedLoginAt`, `lastLoginAt`, `isBanned`, `bannedUntil`, `banReason`.
   - Leaderboard & GD Stats: `classicPp`, `platformerPp`, `challengePp`, `creatorPoints`, `spPoints`, `gdStars`, `gdMoons`, `gdDemons`, `gdHasGlobalRank`, `gdStatsUpdatedAt`, `hardestClassicLevelId`, `hardestPlatformerLevelId`, `hardestChallengeLevelId`.
   - Easter Egg: `easterEggCompleted`, `easterEggPoints`, `easterEggCode`, `easterEggSpins`, `easterEggLastSlot`, `easterEggDailyCount`, `easterEggDailyDate`.
   - Badges & Likes: `likedUserIds` (danh sách ID đã thả tim), `displayedBadgeIds`, `hideAllBadges`.
2. **`Clan`**:
   - `id`, `name`, `tag` (2-4 ký tự hoa), `slug` (tag viết thường), `description`, `color`, `colorGradient`, `themeColor`, `themeGradient`, `avatarUrl`, `coverUrl`.
   - `leaderId` (User làm trưởng Clan), `isSuspended`, `gracePeriodUntil` (thời hạn ân hạn 7 ngày khi tụt Tier).
   - Quan hệ: `members` (`ClanMember[]`), `contributions` (`ClanSpContribution[]`), `joinRequests` (`ClanJoinRequest[]`), `bans` (`ClanBan[]`).
3. **`ClanMember`**: `clanId`, `userId`, `role` (`LEADER`, `MODERATOR`, `MEMBER`), `joinedAt`.
4. **`ClanSpContribution`**: `clanId`, `userId`, `spPledged` (số SP đóng góp cho clan).
5. **`ClanJoinRequest`**: `clanId`, `userId`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `message`.
6. **`ClanBan`**: `clanId`, `userId`, `reason`, `bannedAt`.
7. **`Level`**:
   - `id`, `gdLevelId` (ID level Geometry Dash), `name`, `creatorName`, `creatorId` (User nếu là người trong web), `mode` (`CLASSIC`, `PLATFORMER`), `difficultyFace`, `ratingType` (`NONE`, `RATED`, `FEATURED`, `EPIC`, `LEGENDARY`, `MYTHIC`), `basePp`, `placement` (thứ hạng trên bảng xếp hạng), `minPercent`, `isChallenge`, `isNational`, `youtubeUrl`, `password`.
8. **`Record`**:
   - `id`, `userId`, `legacyPlayerName`, `levelId`, `progress` (0-100), `timeMs` (đối với Platformer), `videoUrl`, `rawProofUrl`, `hz`, `fps`, `device`, `comment`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `reviewerId`, `reviewedAt`, `rejectReason`, `prioritySp`.
9. **`CreatorWork`**:
   - `id`, `userId`, `title`, `levelName`, `gdLevelId`, `description`, `role` (Decor, Layout, Verifier...), `proofUrl`, `images`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `reviewerId`, `awardedCp`.
10. **`LevelSubmission`**: Màn chơi đề xuất đưa vào Demonlist/Platformerlist chờ ban quản trị kiểm duyệt.
11. **`Badge` & `UserBadge`**:
    - `Badge`: `id`, `name`, `description`, `iconUrl`, `iconName`, `glowColor`, `color2`, `effect` (`none`, `glow`, `fire`, `electric`...), `sortOrder`, `systemKey` (`CREATOR_MYTHIC`, `CREATOR_LEGENDARY`, `CREATOR_EPIC`, `CREATOR_FEATURED`, `CREATOR_RATED`, `GRINDER_STAR`, `GRINDER_MOON`, `GRINDER_DEMON`).
    - `UserBadge`: `userId`, `badgeId`, `grantedAt`, `grantedBy`.
12. **`SiteAnnouncement`**: Thông báo hệ thống, hỗ trợ bình chọn (`poll` Json), đối tượng người xem (`audience`), thả tim (`likedUserIds`).
13. **`RedeemCode` & `RedeemCodeUse`**: Mã quà tặng, loại phần thưởng (`SUPPORTER`, `SP_POINTS`, `GLITCH_THEME`), số ngày, số SP, giới hạn lượt dùng, ngày hết hạn.
14. **`UserSpGrant`**: Lịch sử cấp SP Coin (số lượng, ngày hết hạn theo chu kỳ supporter 30 ngày).
15. **`AuditLog`**: Lưu nhật ký các hành động nhạy cảm của Admin/Mod (Ban user, đổi role, xóa kỷ lục, cấp badge...).

### 3.2. Cơ Chế Runtime Schema Synchronization (`src/lib/ensureSchema.ts`)
- **Vấn đề giải quyết**: Tránh sập server khi database production chưa chạy `prisma db push` hoặc thiếu các cột mới bổ sung.
- **Cơ chế hoạt động**:
  - Khi khởi động hoặc nhận request đầu tiên, `ensureSchema.ts` truy vấn bảng `information_schema.columns` để kiểm tra danh sách các cột thực tế.
  - Tự động chạy lệnh SQL an toàn: `ALTER TABLE "..." ADD COLUMN IF NOT EXISTS "..." ...`
  - Tự động tạo các bảng phụ nếu chưa có: `PageVisit`, `ListChangeLog`, `Clan`, `ClanMember`, `ClanSpContribution`, `ClanBan`, `RedeemCode`, `RedeemCodeUse`, `UserSpGrant`, v.v.
  - Tự động tạo index tăng tốc độ truy vấn: `CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username")`, v.v.

---

## 4. BẢN ĐỒ PHÂN TÍCH CHI TIẾT TỪNG FILE MỘT TRONG HỆ THỐNG

### 4.1. Core Libraries (`src/lib/*.ts`)

#### [auth.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/auth.ts)
- **Chức năng**: Quản lý phiên đăng nhập JWT, cookie auth, kiểm tra tính hợp lệ của token và phân quyền người dùng.
- **Export chính**:
  - `signToken(payload)`: Ký JWT HS256 với thời hạn 7 ngày (`TOKEN_MAX_AGE = 604800s`).
  - `verifyToken(token)`: Xác minh chữ ký JWT bằng secret key lấy từ `jwtSecretBytes()`.
  - `setAuthCookie(token)` / `clearAuthCookie()`: Đặt và xóa cookie `gdvnc_token` (HttpOnly, Secure ở prod, SameSite=Lax).
  - `getAuthUser()`: Lấy JWT payload trực tiếp từ cookie store.
  - `getSessionUser()`: Lấy user từ DB theo JWT userId, kiểm tra `tokenVersion` khớp với token, tự động gỡ ban nếu `bannedUntil` đã quá hạn.
  - `requireActiveUser()` / `requireAuth()`: Ném lỗi `UNAUTHORIZED` hoặc `BANNED`.
  - `requireAdmin()`: Yêu cầu quyền Staff (`ADMIN` hoặc `MODERATOR`).
  - `requireFullAdmin()`: Yêu cầu quyền Full Admin (`role === 'ADMIN'`).
  - `requireSuperAdmin()`: Yêu cầu Super Admin (khớp username `iNeQaH` hoặc list env).
  - `bumpTokenVersion(userId)`: Tăng `tokenVersion` trong DB để hủy toàn bộ phiên cũ tức thì.
- **Database**: Bảng `User`.
- **Lưu ý bảo mật & Pitfalls**: Khi user đổi mật khẩu hoặc bị ban, bắt buộc phải gọi `bumpTokenVersion` để vô hiệu hóa cookie trên mọi thiết bị khác.

#### [clan.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/clan.ts) & [clanTypes.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/clanTypes.ts)
- **Chức năng**: Cốt lõi của hệ sinh thái Clan: tính toán điểm SP Coin, cấp bậc Clan Tier, cơ chế ân hạn 7 ngày và thuật toán đá thành viên tự động khi tụt Tier.
- **Quy tắc Tier Clan (`CLAN_TIER_CONFIG`)**:
  - `Tier 0`: 0 - 2 SP (Không đủ điều kiện thành lập/duy trì).
  - `Tier 1`: 3 - 9 SP (Sức chứa tối đa: 15 thành viên, màu tag đơn sắc).
  - `Tier 2`: 10 - 19 SP (Sức chứa tối đa: 25 thành viên, mở khóa Màu Gradient tag & Theme Gradient).
  - `Tier 3`: 20 - 49 SP (Sức chứa tối đa: 40 thành viên, mở khóa Hiệu ứng Glow phát quang).
  - `Tier 4`: >= 50 SP (Sức chứa tối đa: 60 thành viên, Cấp tối đa).
- **Hàm xử lý quan trọng**:
  - `calculateUserSp(user)`: Tính SP của user. Cứ mỗi 30 ngày Supporter còn lại = 1 SP Coin (`Math.ceil(diff / 30d)`). Nếu hết hạn supporter hoặc không có supporter -> SP = 0.
  - `syncAndGetClanSp(clanId)`: Tính lại tổng SP đóng góp từ các thành viên còn trong Clan, tự động dọn dẹp các SP đóng góp vượt quá số SP thực tế của user (clamp về `userMaxSp`), xóa contribution nếu user hết hạn supporter.
  - `pruneExcessClanMembers(clan, maxAllowed, tierName)`: Tự động loại bỏ thành viên dôi dư sau 7 ngày ân hạn theo thứ tự ưu tiên:
    1. Không có chức vụ (`MEMBER` bị đá trước `MODERATOR`). `LEADER` tuyệt đối không bị đá.
    2. Đóng góp SP ít hơn (0 SP bị đá trước 1 SP, 2 SP...).
    3. Ít hoạt động (thời gian `lastLoginAt` cũ nhất bị đá trước).
    4. Tự động gửi thông báo (`Notification`) giải thích lý do cho người bị mời ra khỏi Clan.
- **Lưu ý bảo mật & Tối ưu**: Khi Clan tụt Tier, gọi `bustPublicCache(CACHE_TAGS.LEADERBOARD)` để giao diện cập nhật ngay.

#### [ScoringEngine.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/ScoringEngine.ts)
- **Chức năng**: Động cơ tính điểm kỹ năng (PP - Pointercrate/Performance Points) cho người chơi.
- **Công thức tính điểm**:
  - Level Ranked (vị trí 1 đến 500): Tính theo hàm mũ giảm dần: $P(x) = MIN\_PP \times e^{k \times (500 - x)}$, trong đó $MAX\_PP = 400$, $MIN\_PP = 20$.
  - Level Unranked (ngoài list Demonlist): Thưởng điểm theo độ khó: Extreme Demon = 7 PP, Insane Demon = 6 PP, Hard = 5 PP, Medium = 4 PP, Easy = 3 PP.
  - Tính điểm theo tiến độ (`awardedPpForProgress`): Đạt `minPercent` nhận 10% điểm base, đạt 100% nhận 100% điểm base, nội suy tuyến tính ở giữa.
  - Điểm tổng của người chơi (`calculatePlayerPp`): Điểm các level được xếp giảm dần và nhân trọng số lũy thừa $0.95^i$ để ngăn chặn cày cuốc số lượng vượt qua trình độ cao cấp.
- **Tối ưu**: Tính toán thuần toán học, thời gian thực thi cực nhanh (O(N log N) cho mảng records).

#### [leaderboard.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/leaderboard.ts) & [recordUtils.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/recordUtils.ts)
- **Chức năng**: Truy vấn, tổng hợp và xếp hạng người chơi trên 4 bảng xếp hạng: Classic, Platformer, Challenge, và Creator Points.
- **Export chính**:
  - `getCachedLeaderboard(mode, forceRefresh)`: Lấy dữ liệu BXH từ bộ nhớ đệm (In-memory Cache `publicCache`), tự làm mới sau TTL hoặc khi bị xóa bộ nhớ đệm (`clearLeaderboardCache`).
  - `dedupeRecordsByLevel(records)`: Lọc giữ lại kỷ lục tốt nhất của mỗi user trên từng level (tiến độ cao nhất, thời gian ngắn nhất).
  - `pickHardestLevel(records, mode)`: Xác định màn chơi khó nhất người chơi từng vượt qua để hiển thị trên profile và bảng xếp hạng.
- **Database**: Bảng `User`, `Record`, `Level`, `Clan`, `ClanMember`.

#### [gdBrowserSync.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/gdBrowserSync.ts)
- **Chức năng**: Tự động đồng bộ các chỉ số Geometry Dash chính thức (Stars, Moons, Demons, CP) từ GDBrowser API.
- **Cơ chế Cooldown & Điều kiện xếp hạng**:
  - **Điều kiện Global Rank**: Chỉ khi người chơi có thứ hạng xếp hạng toàn cầu hợp lệ (`rank >= 1` và không unranked/ban) thì các chỉ số Stars, Moons, Demons mới được chấp nhận lưu vào DB. Nếu không có rank -> set về 0 và tự động thu hồi huy hiệu Grinder.
  - **Cooldown 72 giờ**: Áp dụng thời gian chờ 72 giờ (`72 * 60 * 60 * 1000` ms) đối với người chơi không có Global Rank để không spam API ngoài.
  - **Cooldown 5 phút**: Áp dụng cho người chơi có rank bình thường.
  - Creator Points (CP) được cập nhật độc lập, không bị ảnh hưởng bởi Global Rank.

#### [creatorPoints.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/creatorPoints.ts) & [creatorLevelsSync.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/creatorLevelsSync.ts)
- **Chức năng**: Quản lý điểm sáng tạo (CP), tự động liên kết các level trong DB vào danh sách "Level đã tạo" trên profile của người dùng và tự động cấp 5 cấp bậc huy hiệu Creator:
  - Cấp bậc ưu tiên: `Mythic > Legendary > Epic > Featured > Rated`.
  - Quy tắc: Cấp cao hơn tự động thay thế và gỡ bỏ toàn bộ huy hiệu cấp thấp hơn.

#### [rateLimit.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/rateLimit.ts)
- **Chức năng**: Kiểm soát tần suất truy cập bằng thuật toán Sliding Window / Fixed Window theo khóa (IP hoặc User ID).
- **Cơ chế**: Lưu trữ trong `Map<string, Bucket>` với cơ chế tự động dọn dẹp (pruning) nền định kỳ mỗi 60 giây. Trả về mã lỗi HTTP 429 kèm header `Retry-After`.

#### [captcha.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/captcha.ts)
- **Chức năng**: Hệ thống Proof-of-Work (PoW) SHA-256 Captcha chống bot tự động, không phụ thuộc vào dịch vụ ngoài (Google reCAPTCHA / Cloudflare Turnstile).
- **Cơ chế**:
  - Server cấp `seed` gắn kèm timestamp và HMAC chữ ký.
  - Client tính toán giá trị `nonce` sao cho SHA256(`${seed}:${nonce}`) bắt đầu bằng số lượng số 0 tương ứng với độ khó (`POW_DIFFICULTY = 5`).
  - Server xác minh độ khớp, kiểm tra IP fingerprint và cấp captcha token có thời hạn 10 phút.

#### [htmlSanitize.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/htmlSanitize.ts) & [contentFilter.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/contentFilter.ts)
- **Chức năng**: Khử mã độc XSS trong các đoạn văn bản giàu định dạng (HTML, Markdown, Bio, FAQ).
- **Cơ chế**:
  - Bộ phân tích Allowlist thuần túy (không dùng jsdom/DOMPurify để tránh crash trên serverless/edge).
  - Chỉ cho phép các thẻ an toàn (`p`, `br`, `strong`, `em`, `a`, `img`, `table`, `code`, `iframe` từ các host được duyệt như YouTube, Vimeo, Spotify, Discord).
  - Loại bỏ hoàn toàn các thuộc tính nguy hiểm (`onclick`, `onload`, `srcdoc`, `javascript:...`).
  - `contentFilter.ts`: Bộ lọc từ ngữ nhạy cảm, chống spam URL độc hại trong tiểu sử (Bio).

#### [localFileStorage.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/localFileStorage.ts) & [imageUploadValidate.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/imageUploadValidate.ts)
- **Chức năng**: Lưu trữ và quản lý tập tin tải lên cục bộ (Local Storage) thay thế dịch vụ bên thứ ba UploadThing.
- **Thư mục lưu trữ**: `user-data/uploads/` và `user-data/snapshots/`.
- **Cơ chế an toàn**:
  - Giới hạn kích thước tối đa 16 MB.
  - Tiền tố sở hữu: `u_<userId>_<timestamp>-<uuid>-<filename>` giúp kiểm soát quyền sở hữu file.
  - Phòng chống Path Traversal: Kiểm tra `resolvedPath.startsWith(uploads + path.sep)`.

#### [customTheme.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/customTheme.ts), [color.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/color.ts) & [themeUnlocks.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/themeUnlocks.ts)
- **Chức năng**: Xử lý biến màu sắc CSS động, tính toán tương phản, sinh mã màu Gradient và kiểm tra điều kiện mở khóa theme người dùng.

#### [gdvnSheet.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/gdvnSheet.ts) & [syncGdvnSheet.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/syncGdvnSheet.ts)
- **Chức năng**: Kết nối và đồng bộ dữ liệu từ Google Sheets Demonlist GDVN vào cơ sở dữ liệu.

#### [supportPayment.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/supportPayment.ts)
- **Chức năng**: Tính toán giá gói ủng hộ Supporter (20.000 VNĐ / tháng, các mốc 3 tháng, 6 tháng, 1 năm) và tính toán số tháng từ số tiền chuyển khoản thực tế của SePay.

#### [audit.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/audit.ts) & [deleteUser.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/deleteUser.ts)
- **Chức năng**:
  - `logAudit`: Ghi lại nhật ký kiểm toán hệ thống vào bảng `AuditLog`.
  - `deleteUserAccount`: Xóa sạch tài khoản người dùng, xử lý ngắt quan hệ foreign keys, xóa các file upload liên quan và tính toán lại điểm bảng xếp hạng.

---

### 4.2. Tất Cả 98 API Endpoints (`src/app/api/**/route.ts`)

#### Nhóm Xác Thực & Tài Khoản (`/api/auth/*`)
1. **`POST /api/auth/login`**:
   - Xác thực đăng nhập qua username hoặc email và mật khẩu.
   - Kiểm tra account lockout (`failedLoginAttempts >= 5`, khóa 15 phút), kiểm tra cùng nguồn gốc `isBrowserSameOriginFetch`, dummy password hash chống timing attack khi tài khoản không tồn tại, hỗ trợ TOTP 2FA. Đặt cookie `gdvnc_token`.
2. **`POST /api/auth/register`**:
   - Đăng ký tài khoản mới. Kiểm tra Captcha PoW, tính hợp lệ của username (`/^[a-zA-Z0-9_.-]{3,24}$/`), băm mật khẩu qua `bcryptjs` (salt rounds 10), tạo bản ghi `User` và cấp token phiên.
3. **`GET /api/auth/me`**:
   - Trả về thông tin phiên người dùng hiện tại, tự động cập nhật `lastLoginAt`, trả về thông tin Clan, quyền hạn role, số SP Coin và trạng thái Supporter.
4. **`POST /api/auth/logout`**:
   - Xóa cookie phiên `gdvnc_token` và `gdvnc_ui`.
5. **`GET /api/auth/captcha`**:
   - Cấp phát bài toán thử thách Proof-of-Work (seed + difficulty) cho client giải.
6. **`POST /api/auth/2fa`**:
   - Bật / tắt xác thực hai yếu tố (TOTP) qua mã ứng dụng Authenticator (Google Authenticator / Authy).
7. **`POST /api/auth/send-otp`** & **`POST /api/auth/send-reset-otp`**:
   - Sinh và gửi mã OTP 6 số qua email để xác thực email hoặc đặt lại mật khẩu.
8. **`POST /api/auth/reset-password`**:
   - Đặt lại mật khẩu bằng mã OTP xác thực hợp lệ. Tự động tăng `tokenVersion` để hủy toàn bộ phiên cũ.

#### Nhóm Hệ Thống Clan (`/api/clans/*`)
9. **`GET /api/clans`**:
   - Lấy danh sách toàn bộ Clan. Tính toán tổng SP Coin thực tế, cấp bậc Tier, trạng thái tạm ngưng (suspended) và thời hạn ân hạn 7 ngày. Hỗ trợ tìm kiếm theo tên/tag và sắp xếp (`sp`, `members`, `name`).
10. **`POST /api/clans`**:
    - Thành lập Clan mới. Điều kiện: User phải có ít nhất 3 SP Coin (hoặc quyền Staff). Người tạo tự động trở thành `LEADER` và đóng góp 3 SP Coin khởi tạo. Tên Clan từ 2-40 ký tự, Tag 2-4 ký tự hoa duy nhất.
11. **`GET /api/clans/[slug]`**:
    - Lấy chi tiết Clan theo `slug` (tag thường). Trả về danh sách thành viên, đóng góp SP Coin, vai trò (`LEADER`, `MODERATOR`, `MEMBER`), màn chơi yêu thích, và danh sách Featured Creator Works của các thành viên trong Clan.
12. **`PATCH /api/clans/[slug]`**:
    - Chỉnh sửa thông tin Clan (Mô tả, màu sắc, avatar, cover, màn chơi yêu thích). Yêu cầu quyền `LEADER` hoặc `MODERATOR` của Clan. Nếu Clan < Tier 2 thì cấm đổi màu Gradient.
13. **`DELETE /api/clans/[slug]`**:
    - Giải tán Clan. Chỉ `LEADER` của Clan hoặc Full Admin mới có quyền thực hiện. Hoàn trả trạng thái SP cho các thành viên.
14. **`POST /api/clans/[slug]/join`**:
    - Gửi yêu cầu gia nhập Clan. Kiểm tra Clan chưa đầy theo giới hạn thành viên của Tier hiện tại và user chưa bị cấm (`ClanBan`).
15. **`POST /api/clans/[slug]/donate`**:
    - Đóng góp SP Coin vào Clan. Kiểm tra số SP đóng góp không vượt quá số SP Coin hiện có của user.
16. **`POST /api/clans/[slug]/transfer`**:
    - Chuyển giao chức vụ Trưởng Clan (`LEADER`) cho một thành viên khác.
17. **`POST /api/clans/[slug]/requests/[id]`**:
    - Duyệt (`APPROVE`) hoặc từ chối (`REJECT`) đơn xin vào Clan.
18. **`PATCH /api/clans/[slug]/members/[id]/role`**:
    - Thăng chức lên `MODERATOR` hoặc hạ chức xuống `MEMBER`.
19. **`DELETE /api/clans/[slug]/members/[id]`**:
    - Trục xuất thành viên khỏi Clan (hoặc tự rời Clan).
20. **`GET /api/clans/[slug]/bans`** & **`POST /api/clans/[slug]/bans`** & **`DELETE /api/clans/[slug]/bans/[id]`**:
    - Quản lý danh sách cấm thành viên gia nhập Clan.

#### Nhóm Hồ Sơ & Trang Cá Nhân (`/api/profile/*`)
21. **`GET /api/profile/[username]`**:
    - Lấy thông tin hồ sơ đầy đủ: metadata định danh, chỉ số GD, bảng kỷ lục đã duyệt (Classic, Platformer), level đã tạo, huy hiệu đang sở hữu, clan đang tham gia và số lượt thả tim.
    - Kích hoạt đồng bộ nền GDBrowser nếu đã hết hạn cooldown (`syncUserGdBrowserStats`) và tự động link level trong DB (`autoLinkUserCreatedLevels`).
22. **`PATCH /api/profile/[username]`**:
    - Cập nhật thông tin trang cá nhân: Bio (kiểm tra chống từ cấm/XSS), Discord Tag, Country, GD Username, màu tên, font tên, hiệu ứng glow, theme profile và cấu hình dark/light mode riêng cho profile.
23. **`DELETE /api/profile/[username]`**:
    - Tự xóa tài khoản (hoặc Super Admin xóa). Yêu cầu xác nhận mật khẩu.
24. **`POST /api/profile/[username]/like`**:
    - Thả tim hoặc bỏ tim trang cá nhân (mỗi user chỉ thả tim 1 lần, bấm lại để hủy). Lưu vào mảng `likedUserIds` của User.

#### Nhóm Kỷ Lục & Màn Chơi (`/api/records`, `/api/levels`, `/api/submit`)
25. **`POST /api/submit`**:
    - Gửi kỷ lục mới (`PLAYER`) hoặc tác phẩm sáng tạo (`CREATOR`). Kiểm tra trùng lặp kỷ lục đang chờ duyệt, validate link video HTTPS, Hz, FPS, progress (0-100), timeMs. Tự động tạo stub level nếu chưa có trong DB.
26. **`GET /api/submit/mine`**:
    - Lấy danh sách các đơn đã nộp của chính người dùng hiện tại kèm trạng thái duyệt.
27. **`GET /api/levels`**:
    - Lấy danh sách màn chơi theo mode (`CLASSIC`, `PLATFORMER`), phân loại (`demonlist`, `pemonlist`, `featured`, `vn`, `challenge`), hỗ trợ tìm kiếm, lọc độ khó và phân trang.
28. **`GET /api/leaderboard`**:
    - Lấy dữ liệu bảng xếp hạng kỹ năng (Classic, Platformer, Challenge, Creator Points, Grinder Stars/Moons/Demons).
29. **`GET /api/leaderboard/highlights`**:
    - Lấy top 3 người chơi dẫn đầu (Podium) để hiển thị nổi bật trên trang chủ.

#### Nhóm Quản Trị Hệ Thống (`/api/admin/*`)
30. **`GET /api/admin/records/pending`**:
    - Lấy danh sách kỷ lục đang chờ duyệt. Sắp xếp các record import (không có người duyệt) xuống dưới cùng; hỗ trợ bộ lọc nguồn duyệt (`ALL`, `REVIEWED`, `IMPORTED`).
31. **`PATCH /api/admin/records/[id]`**:
    - Phê duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) kỷ lục. Khi phê duyệt: tự động tính lại điểm người chơi (`recalculatePlayerPoints`), cập nhật màn chơi khó nhất, gửi notification và xóa cache BXH.
32. **`DELETE /api/admin/records/[id]`**:
    - Xóa kỷ lục khỏi hệ thống và tính lại điểm.
33. **`GET /api/admin/levels`** & **`POST /api/admin/levels`** & **`PATCH /api/admin/levels`**:
    - Quản lý danh sách màn chơi: thêm mới, đổi thứ hạng placement, đổi basePp, sửa ID GD, cập nhật nhạc/video.
34. **`POST /api/admin/levels/recalc-scores`**:
    - Tính toán lại toàn bộ điểm số của tất cả người chơi trong hệ thống.
35. **`GET /api/admin/users`**:
    - Quản lý danh sách người dùng, tìm kiếm theo tên, email, lọc theo role, trạng thái ban.
36. **`POST /api/admin/users/[id]/role`**:
    - Phân quyền người dùng (`ADMIN`, `MODERATOR`, `USER`). Yêu cầu `FullAdmin`. Không cho phép hạ quyền Super Admin.
37. **`POST /api/admin/users/[id]/ban`**:
    - Khóa tài khoản người dùng (vĩnh viễn hoặc có thời hạn kèm lý do). Tự động kích hoạt `bumpTokenVersion` để đá phiên lập tức.
38. **`POST /api/admin/users/[id]/reset-password`**:
    - Đặt lại mật khẩu cưỡng chế cho tài khoản người dùng. Yêu cầu `SuperAdmin`.
39. **`GET /api/admin/badges`** & **`POST /api/admin/badges`** & **`PATCH /api/admin/badges/[id]`** & **`DELETE /api/admin/badges/[id]`**:
    - Quản lý huy hiệu: tạo mới, sửa icon SVG/URL, màu phát quang `glowColor`, màu phụ `color2`, hiệu ứng `effect`, thứ tự sắp xếp `sortOrder`.
40. **`POST /api/admin/users/[id]/badges`**:
    - Trao hoặc thu hồi huy hiệu thủ công cho người dùng cụ thể.
41. **`GET /api/admin/works`** & **`PATCH /api/admin/works/[id]`**:
    - Duyệt các tác phẩm sáng tạo của creator (`CreatorWork`) và trao Creator Points thưởng.
42. **`GET /api/admin/level-submissions`** & **`PATCH /api/admin/level-submissions/[id]`**:
    - Duyệt các màn chơi đề xuất đưa vào danh sách list chính thức.
43. **`GET /api/admin/redeem-codes`** & **`POST /api/admin/redeem-codes`** & **`DELETE /api/admin/redeem-codes/[id]`**:
    - Tạo và quản lý mã đổi quà tặng (Supporter, SP Coin, Theme Lỗi).
44. **`GET /api/admin/audit-logs`**:
    - Xem nhật ký các hành động nhạy cảm của ban quản trị.
45. **`GET /api/admin/security-scan`**:
    - Quét lỗ hổng hệ thống: tìm tài khoản mật khẩu yếu, token bất thường, file rác không nguồn gốc.
46. **`GET /api/admin/backup`**:
    - Sao lưu toàn bộ dữ liệu cơ sở dữ liệu sang định dạng JSON/SQL. Yêu cầu `SuperAdmin`.

#### Nhóm Webhooks, Cron & Tải Lên Tập Tin
47. **`POST /api/webhooks/sepay`**:
    - Webhook nhận thông báo biến động số dư từ cổng thanh toán SePay.
    - Xác thực bảo mật: Kiểm tra header `Authorization` (ApiKey/Bearer) hoặc chữ ký HMAC-SHA256 `X-SePay-Signature` với bí mật `SEPAY_WEBHOOK_SECRET` bằng hàm an toàn `crypto.timingSafeEqual`.
    - Phân tích cú pháp nội dung chuyển khoản: nhận diện từ khóa `GDVN <username>`, số tháng (`3T`, `6T`, `12T`), tự động tìm user trong DB, cộng dồn ngày Supporter (`supporterUntil`), cấp các bản ghi `UserSpGrant`, ghi `AuditLog` và gửi `Notification`.
48. **`POST /api/uploads`**:
    - Tải ảnh lên lưu trữ cục bộ (`localFileStorage.ts`). Kiểm tra quyền đăng nhập, xác thực dung lượng (tối đa 16MB) và định dạng ảnh (JPEG, PNG, WEBP, GIF).
49. **`GET /api/uploads/[...path]`**:
    - Phục vụ tập tin tĩnh từ thư mục `user-data/uploads/`.
    - **Bảo mật tuyệt đối**: Ngăn chặn Directory Traversal bằng kiểm tra đường dẫn chuẩn hóa, cấm phục vụ file SVG/HTML để triệt tiêu lỗ hổng Stored XSS, kiểm tra magic bytes đầu file và gắn header `X-Content-Type-Options: nosniff`.
50. **`GET /api/cron/sync-gdvn-sheet`**:
    - Cron job đồng bộ Google Sheet Demonlist tự động. Yêu cầu xác thực `Authorization: Bearer <CRON_SECRET>`.
51. **`GET /api/cron/purge-notifications`**:
    - Dọn dẹp các thông báo hệ thống cũ quá 30 ngày để tối ưu dung lượng DB.
52. **`GET /api/easter-egg`** & **`POST /api/easter-egg`**:
    - Xử lý trò chơi mini quay thưởng vòng quay Easter Egg trên logo. Khi đạt 100 điểm, cấp mã quà tặng 6 ký tự ngẫu nhiên `[A-Z0-9]{6}` và khóa vĩnh viễn không cho chơi lại.
53. **`POST /api/redeem`**:
    - Đổi mã quà tặng lấy ngày Supporter, SP Coin hoặc Theme Lỗi bí ẩn.
54. **`GET /api/health`**:
    - Endpoint kiểm tra trạng thái hoạt động (Healthcheck) của server và kết nối database.

---

### 4.3. UI Components & Hệ Thống Giao Diện (`src/components/**/*.tsx`)

#### Thanh Điều Hướng & Bố Cục Tổng Thể
- **[Sidebar.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/Sidebar.tsx)**:
  - Thanh điều hướng sườn trái responsive (Desktop cố định, Mobile drawer trượt mượt mà).
  - Tích hợp hiệu ứng 3D khối Tsumiki (`tsumiki-btn`) ở theme iNeQaH, quản lý đóng/mở accordion Bảng xếp hạng và Danh sách level, tự động thu gọn (collapse) khi chuyển trang khác.
  - Xử lý Easter Egg: đếm số lần click vào Logo GDVN. Khi đạt điều kiện thì mở popup hiển thị mã đổi thưởng hoặc kích hoạt vòng quay.
- **[FloatingNav.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/FloatingNav.tsx)**:
  - Thanh menu nổi hỗ trợ điều hướng nhanh trên các thiết bị di động.
- **[BrandMark.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/BrandMark.tsx)**:
  - Logo và biểu tượng thương hiệu GDVN với SVG vector sắc nét.

#### Hiển Thị Người Dùng, Tên & Huy Hiệu
- **[UserDisplayName.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/UserDisplayName.tsx)**:
  - Trái tim hiển thị danh tính người chơi trên toàn hệ thống: Tên hiển thị (`displayName` hoặc `username`), Tag Clan `[TAG]`, icon Staff (`Crown` cho Admin, `ShieldCheck` cho Moderator), font tùy biến (Pusab, Katto, Press Start 2P...), màu Gradient và hào quang Glow.
  - **Thuật toán HSV Luminous Glow (`ensureLuminousGlowColor`)**: Chuyển đổi màu sắc sang không gian HSV và cưỡng chế độ sáng `v >= 0.92` (và độ bão hòa `s >= 0.70`) khi hiển thị trên nền sáng để biến mọi màu glow tối thành dải neon pastel phát quang rực rỡ, triệt tiêu hoàn toàn hiện tượng vệt đen bẩn.
  - Hiển thị Glow ôm sát ký tự (1 layer drop-shadow 2.5px - 4px), không dùng mix-blend-mode gây lỗi isolate buffer khi hover.
- **[BadgeIcon.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/BadgeIcon.tsx)**:
  - Render huy hiệu với các icon SVG tùy biến, màu nền, viền phát quang và các hiệu ứng động (`glow`, `fire`, `electric`, `rainbow`, `none`). Nếu chọn `none` hoặc màu đen, cưỡng chế tắt hoàn toàn glow để chống vệt thâm.
- **[GdWebIcons.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/GdWebIcons.tsx)**:
  - Thư viện 25+ icon SVG chuyên biệt Geometry Dash & GDVN (CP hammer & brush, Star, Moon, Diamond, Secret Coin, Demon, Wave, Ship, UFO, WebDev, WebCrown, WebShield, WebClan...).

#### Hệ Thống Theme & Tùy Biến
- **[ThemeProvider.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/ThemeProvider.tsx)**:
  - Context quản lý theme toàn cục: lưu `gdvnc_theme` và `gdvnc_mode` vào localStorage.
  - Hỗ trợ `setOverrideTheme` và `setOverrideMode` cục bộ (giúp profile cá nhân có thể mang theme riêng biệt mà không làm sai lệch theme chung của người đang duyệt web).
- **[ThemeSwitcher.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/ThemeSwitcher.tsx)**:
  - Hộp thoại chọn nhanh giữa các bảng màu (Sky, Mint, Peach, Lavender, Mono, Sakura, Custom, và theme bí ẩn `"???"`).

#### Hệ Thống Clan Components
- **[ClanDiscordMemberSidebar.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanDiscordMemberSidebar.tsx)**:
  - Thanh danh sách thành viên phong cách Discord: hiển thị avatar, trạng thái online, chức vụ (Leader, Moderator, Member), đóng góp SP Coin. Giữ giao diện thuần xem thông tin, không đặt nút thăng chức/kick làm rối mắt.
- **[ClanInfoModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanInfoModal.tsx)**:
  - Modal cẩm nang hệ thống Clan song ngữ Việt/Anh: giải thích cơ chế SP Coin, quyền lợi từng Tier, cảnh báo tụt Tier và cơ chế ân hạn 7 ngày.
- **[ClanSettingsModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanSettingsModal.tsx)**:
  - Bảng điều khiển cài đặt toàn diện của Clan: đổi avatar, banner cover, mô tả, màu sắc, quản lý phân quyền thành viên, duyệt đơn gia nhập, danh sách cấm và chuyển giao Clan.
- **[CreateClanModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/CreateClanModal.tsx)** & **[JoinClanModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/JoinClanModal.tsx)**:
  - Modal tạo Clan mới và gửi đơn xin gia nhập Clan kèm lời nhắn.

#### Các Component Hỗ Trợ Khác
- **[GlobalToast.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/GlobalToast.tsx)**:
  - Hệ thống thông báo nổi (Toast) và hộp thoại xác nhận toàn cục (Confirm Modal) với `z-[1000000]` đảm bảo luôn nổi lên trên cùng của mọi dialog/popup, hỗ trợ đóng nhanh bằng phím Escape và click backdrop.
- **[SmartCaptcha.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/SmartCaptcha.tsx)**:
  - Component giao diện Proof-of-Work Captcha với thanh tiến trình giải toán SHA256 tự động trên trình duyệt.
- **[DiscordMarkdown.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/DiscordMarkdown.tsx)**:
  - Bộ biên dịch cú pháp Discord Markdown hoàn chỉnh (`**đậm**`, `*nghiêng*`, `__gạch chân__`, `~~gạch ngang~~`, `||spoiler che nội dung||`, block quotes, code blocks) dùng trong thông báo, tiểu sử và luật lệ.
- **[EasterEggOverlay.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/EasterEggOverlay.tsx)**:
  - Giao diện trò chơi máy xèng (slot machine) bí ẩn của Easter Egg.

---

### 4.4. App Pages, Layouts & Subroutes (`src/app/**/page.tsx`)

#### Trang Chủ & Tổng Quan
- **[src/app/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/page.tsx)**:
  - Trang chủ GDVN: Hero section, bục vinh danh Podium Top 3 người chơi Classic & Platformer xuất sắc nhất, danh sách các kỷ lục vừa được phê duyệt mới nhất và tin tức thông báo nổi bật. Sửa triệt để lỗi Hydration Nested `<a>` bằng `linkClan={false}` trong Podium.

#### Trang Bảng Xếp Hạng (`/leaderboard`)
- **[src/app/leaderboard/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/leaderboard/page.tsx)** & **[leaderboard/[tab]/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/leaderboard/[tab]/page.tsx)**:
  - Bảng xếp hạng toàn diện: Tab Classic Demonlist, Platformerlist, Challenge List, Creator Points và GD Stats Grinders (Stars, Moons, Demons).
  - Tích hợp thanh tab trượt `AnimatedTabs` sử dụng `window.history.pushState` giữ URL sạch không nối đuôi `?tab=...` và không làm reload component.

#### Trang Danh Sách Màn Chơi (`/levels`)
- **[src/app/levels/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/levels/page.tsx)** & Các trang con:
  - `/levels/classic`: Danh sách quỷ dữ truyền thống Top 1 - 500.
  - `/levels/platformer`: Danh sách quỷ dữ đi cảnh (Platformer).
  - `/levels/featured` & `/levels/vn`: Danh sách các màn chơi đặc sắc do người Việt Nam sáng tạo.
  - `/levels/challenge`: Danh sách thử thách sóng ngắn / wave / ship siêu khó.
  - `/levels/[id]`: Trang chi tiết từng màn chơi: video xác minh kỷ lục thế giới, điểm số PP thưởng theo %, thông tin ID/Password, danh sách toàn bộ người chơi đã vượt qua kèm video minh chứng.

#### Trang Chi Tiết Clan (`/clan/[slug]`)
- **[src/app/clan/[slug]/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/clan/[slug]/page.tsx)**:
  - Trang chi tiết Clan: Banner cover lớn, thông tin Tier, tổng SP Coin, thanh tiến trình mục tiêu Tier tiếp theo (đặc biệt mốc Tier 4 là 50 SP), banner cảnh báo ân hạn 7 ngày nếu đang tụt Tier.
  - Box Showcase "Màn chơi yêu thích của Clan" cỡ lớn với nền backdrop video YouTube.
  - Box Featured Creator Works: Trưng bày toàn bộ các level do thành viên Clan tạo ra và có đánh giá, tự động fallback tên màn chơi an toàn, chống triệt để lỗi 'Untitled Level'.
  - Tích hợp Sidebar Discord thành viên bên phải.

#### Trang Cá Nhân Người Dùng (`/profile/[username]`)
- **[src/app/profile/[username]/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/profile/[username]/page.tsx)**:
  - Trang hồ sơ cá nhân: Bố cục 2 cột dọc đối xứng hoàn hảo. Cột trái gồm 7 hàng metadata định danh (Clan, GD, Discord, Vị trí, Stars, Moons, Demons). Cột phải gồm Box "Tất cả huy hiệu" mở rộng với thanh cuộn mượt và Box "Tiểu sử" hỗ trợ Discord Markdown.
  - Phía dưới là hàng ngang 3 thẻ chỉ số kỹ năng: Classic PP, Platformer PP, và Creator Points.
  - Nút Thả Tim Profile hình trái tim (`Heart`) kèm số lượt thả thay thế huy hiệu Supporter cũ.
  - Hiệu ứng Theme Lỗi bí ẩn ("???"): chu kỳ 5 giây tĩnh tuyệt đối đan xen 3 giây hỗn loạn, tỷ lệ kích hoạt mỗi hiệu ứng 30%, hiệu ứng avatar chớp nhoáng ~0.1s.

#### Trang Quản Trị Hệ Thống (`/admin`)
- **[src/app/admin/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/admin/page.tsx)** & Các chuyên mục quản trị:
  - `/admin/records`: Duyệt kỷ lục người chơi. Sắp xếp record import xuống cũ nhất, lọc theo người duyệt/import.
  - `/admin/levels`: Quản trị danh sách màn chơi và xếp hạng.
  - `/admin/members`: Quản trị người dùng, phân quyền, cấm tài khoản.
  - `/admin/creator`: Duyệt tác phẩm creator, trao CP.
  - `/admin/functions`: Tạo mã quà tặng Redeem, đồng bộ Google Sheet, dọn dẹp hệ thống. Form nhập tùy chỉnh số ngày không bị tràn viền.

---

## 5. BẢN ĐỒ TRA CỨU ĐỊNH VỊ & SỬA LỖI TỨC THÌ (INSTANT BUG-FIXING MATRIX)

Bảng tra cứu trực tiếp: Khi gặp lỗi hoặc cần chỉnh sửa bất kỳ tính năng nào, tra ngay bảng này để biết **File cần sửa**, **Dòng code liên quan**, **Nguyên nhân cốt lõi** và **Giải pháp**:

| Lĩnh Vực / Lỗi | File Liên Quan & Vị Trí | Nguyên Nhân Cốt Lõi | Cách Khắc Phục Chuẩn Xác |
| :--- | :--- | :--- | :--- |
| **Không đăng nhập được / Báo lỗi tài khoản bị khóa** | `src/app/api/auth/login/route.ts` (L30-80) | `failedLoginAttempts >= 5` khiến `lockedUntil` được kích hoạt (khóa 15 phút). | Kiểm tra `lockedUntil > new Date()`. Admin có thể reset trường này trong bảng `User` hoặc tăng thời gian/giảm số lần thử. |
| **User bị ban nhưng vẫn truy cập được bằng token cũ** | `src/lib/auth.ts` (L97-130) | JWT lưu trên cookie chưa hết hạn và hệ thống không kiểm tra `tokenVersion`. | Gọi `bumpTokenVersion(userId)` khi ban user hoặc đổi mật khẩu. Hàm `getSessionUser()` sẽ kiểm tra `jwt.tokenVersion !== user.tokenVersion` và từ chối token lập tức. |
| **SP Coin của Clan không tự giảm khi Supporter hết hạn** | `src/lib/clan.ts` (L10-40) & `src/lib/clanTypes.ts` | Trước đây SP đóng góp (`spPledged`) được lưu tĩnh trong `ClanSpContribution` mà không kiểm tra thời hạn supporter của user. | Hàm `calculateUserSp` dùng `Math.ceil(diff / 30d)` để lấy SP thực tế. Trong `syncAndGetClanSp`, tự động clamp `Math.min(c.spPledged, userMaxSp)`. Nếu user hết hạn supporter -> xóa contribution về 0. |
| **Clan bị tụt Tier nhưng không đá bớt thành viên dôi dư** | `src/lib/clan.ts` (L52-110) & `api/clans/[slug]/route.ts` | Khi Clan tụt Tier, số lượng thành viên vượt quá `maxMembers` của Tier mới. | Kiểm tra `gracePeriodUntil`. Sau 7 ngày ân hạn, hàm `pruneExcessClanMembers` tự động đá thành viên: ưu tiên đá `MEMBER` trước `MODERATOR`, đá người ít SP trước, đá người có `lastLoginAt` cũ nhất. `LEADER` không bao giờ bị đá. |
| **Thanh tiến trình Clan không hiển thị mốc Tier 4** | `src/app/clan/[slug]/page.tsx` & `src/components/clan/ClanSettingsModal.tsx` | Điều kiện kiểm tra chỉ dừng lại ở Tier 3 hoặc so sánh cứng `tier === 3`. | Dùng mốc 50 SP cho Tier 4. Khi SP từ 20 đến 49, hiển thị "Mục tiêu Tier 4 (50 SP)". Khi đạt >= 50 SP hiển thị "Cấp tối đa (Tier 4)". Dùng `tier >= 3` thay cho `=== 3`. |
| **Level trong Featured Works của Clan bị hiển thị 'Untitled Level'** | `src/app/api/clans/[slug]/route.ts` & `src/app/clan/[slug]/page.tsx` | Object trả về từ API chỉ gán `name: lvl.name` nhưng component chỉ đọc trường `levelName`. | Gán đồng thời cả `levelName`, `name`, `creatorName` và truy vấn bổ trợ từ bảng `Level` theo `gdLevelId`. Component dùng chuỗi fallback đa tầng: `item.levelName \|\| item.name \|\| item.matchedLevel?.name \|\| 'Untitled Level'`. |
| **Mất tên / Chữ trắng tàng hình trên nền sáng ở Sidebar & Nút bấm** | `src/components/Sidebar.tsx` & `src/app/globals.css` | Hardcode class `text-white` đi kèm nền sáng hoặc theme iNeQaH / Mono. | Dùng biến động `color: var(--accent-fg)` hoặc class `text-indigo-950 dark:text-white`. Thay thế floating indicator bằng class 3D `tsumiki-btn shadow-sm` trực tiếp. |
| **Glow tên người dùng bị vệt xám/đen bẩn trên nền sáng** | `src/components/UserDisplayName.tsx` (L10-45) | Xếp chồng nhiều lớp `drop-shadow` có màu tối hoặc dùng `mix-blend-mode: plus-lighter` trong thẻ cha có opacity. | Dùng hàm `ensureLuminousGlowColor` nâng độ sáng HSV `v >= 0.92`, `s >= 0.70` biến màu glow thành neon pastel phát quang. Dùng 1 lớp drop-shadow 2.5px thanh thoát ôm sát chữ. |
| **Chuyển tab bị nối đuôi URL dị dạng `?tab=...` và giật lag** | `src/app/levels/page.tsx` & `src/app/leaderboard/page.tsx` | Dùng `searchParams.set('tab', ...)` kết hợp `router.push` làm re-render toàn bộ trang và sinh query params. | Dùng `window.history.pushState(null, '', '/levels/' + newTab)` kết hợp lắng nghe sự kiện `popstate`. State nội bộ cập nhật tức thì, thanh indicator của `AnimatedTabs` trượt mượt mà. |
| **Modal xác nhận xóa huy hiệu bị chìm dưới form sửa huy hiệu** | `src/components/GlobalToast.tsx` & `src/app/admin/components/LevelsTab.tsx` | Modal Confirm có `z-[100000]`, thấp hơn modal sửa `isBadgeEditModalOpen` (`z-[100100]`). | Nâng Z-Index của Global Confirm Modal lên `z-[1000000]` và Toast lên `z-[1000001]`. Tích hợp đóng bằng phím Escape và click backdrop. |
| **Kéo thả thứ tự huy hiệu trong Admin bị nhảy lại vị trí cũ** | `src/app/admin/components/LevelsTab.tsx` & `api/admin/badges/route.ts` | Bất đồng bộ giữa sắp xếp tăng dần và giảm dần (`sortOrder`). | Đồng bộ thứ tự giảm dần `b.sortOrder - a.sortOrder` xuyên suốt từ truy vấn DB, hiển thị tới hàm kéo thả `handleDropBadge` gán `(total - i) * 10`. |
| **Đồng bộ GDBrowser bị spam request liên tục** | `src/lib/gdBrowserSync.ts` & `src/app/api/profile/[username]/route.ts` | Người chơi không có Global Rank khiến hệ thống liên tục fetch lại mỗi lần tải trang. | Thêm trường `gdHasGlobalRank` vào `User`. Nếu không có rank -> áp dụng cooldown 72 giờ (`72 * 60 * 60 * 1000` ms). Người có rank giữ cooldown 5 phút. |
| **Kỷ lục nộp bị trùng lặp nhiều lần gây nghẽn hàng đợi duyệt** | `src/app/api/submit/route.ts` (L70-85) | Người chơi bấm nút gửi liên tục hoặc gửi nhiều lần cho cùng 1 màn chơi. | Kiểm tra `prisma.record.findFirst` với điều kiện `userId`, `levelId`, `status: PENDING`. Nếu đã có thì chặn ngay bằng mã lỗi HTTP 409 Conflict. |
| **Lỗi Hydration Nested `<a>` trên Podium Trang Chủ** | `src/app/page.tsx` & `src/components/UserDisplayName.tsx` | Thẻ `<a>` của Profile bọc bên ngoài thẻ `<a>` của Clan Tag trong component `UserDisplayName`. | Truyền prop `linkClan={false}` vào `UserDisplayName` khi component này đã nằm bên trong một liên kết khác. |
| **Ảnh đại diện/cover bị tràn góc vuông nhọn ra ngoài thẻ bo góc** | `src/app/profile/[username]/page.tsx` & `src/app/clan/[slug]/page.tsx` | Khung cha có `rounded-2xl` nhưng thiếu `overflow-hidden`, hoặc thẻ `img` con không có bo góc đồng bộ. | Bổ sung `rounded-t-2xl sm:rounded-t-3xl overflow-hidden` đồng bộ cho cả card, cover container và thẻ ảnh `<img>`. |

---

## 6. BÁO CÁO KIỂM TRA BẢO MẬT TOÀN DIỆN (SECURITY AUDIT)

### 6.1. Xác Thực & Phân Quyền (Authentication & Authorization)
- **Cơ chế Token**: Sử dụng JSON Web Token ký HS256 (`jose`). Secret key bắt buộc phải có độ dài từ 32 ký tự trở lên trong môi trường production (`src/lib/secrets.ts`), ném ngoại lệ chặn khởi động nếu cấu hình yếu.
- **Bảo vệ Cookie**: Cookie `gdvnc_token` được gắn cờ `HttpOnly`, ngăn chặn hoàn toàn JavaScript độc hại phía client đọc token (chống cắp token qua XSS). Gắn cờ `Secure` trên production và `SameSite: Lax` để phòng ngừa tấn công Cross-Site Request Forgery (CSRF).
- **Thu hồi phiên tức thời (Instant Session Revocation)**: Khi có sự cố tài khoản, ban user hoặc đổi mật khẩu, hệ thống tăng `tokenVersion` trong cơ sở dữ liệu. Mọi JWT cũ sẽ bị từ chối ngay trong lần gọi API kế tiếp.
- **Kiểm soát truy cập theo vai trò (RBAC)**: Phân tách rõ ràng giữa 3 tầng bảo vệ:
  - `requireAdmin`: Kiểm tra `isStaffRole` (Admin hoặc Moderator).
  - `requireFullAdmin`: Kiểm tra `isFullAdminRole` (`role === 'ADMIN'`).
  - `requireSuperAdmin`: Kiểm tra `isSuperAdminUser` (chỉ cho phép username `iNeQaH` hoặc các user ID được khai báo cứng trong biến môi trường `SUPER_ADMIN_USER_IDS`).

### 6.2. Phòng Chống Tấn Công Tiêm Nhiễm (Injection Prevention)
- **SQL Injection**: Hệ thống sử dụng Prisma ORM làm tầng trung gian, toàn bộ truy vấn được sinh câu lệnh tham số hóa (Parameterized Queries). Đối với các truy vấn raw (`$queryRaw`), toàn bộ biến nội suy đều được bọc trong template literal tag của Prisma, tự động chuyển thành biến bind `$1, $2` an toàn tuyệt đối.
- **Cross-Site Scripting (XSS)**:
  - Văn bản phong phú (Bio, Announcements, FAQ): Sử dụng bộ lọc allowlist tùy biến trong `src/lib/htmlSanitize.ts`. Loại bỏ toàn bộ thẻ script, style, thuộc tính sự kiện `on*`, và chặn các lược đồ URI nguy hiểm (`javascript:`, `vbscript:`, `data:`).
  - Iframe nhúng: Chỉ cho phép các domain tin cậy được định nghĩa trong `ALLOWED_IFRAME_HOSTS` (YouTube, Vimeo, Discord, Spotify, Google Drive/Docs).
- **Stored XSS qua File Uploads**: Trong `/api/uploads/[...path]/route.ts`, hệ thống phát hiện định dạng tập tin qua magic bytes và từ chối tuyệt đối việc phục vụ các tập tin có MIME type là `image/svg+xml` hoặc chứa mã `html` từ thư mục tải lên công khai.

### 6.3. Phòng Chống Brute-Force & Từ Chối Dịch Vụ (DoS / DDoS)
- **Account Lockout**: Tài khoản đăng nhập sai quá 5 lần liên tiếp sẽ bị khóa tạm thời 15 phút (`failedLoginAttempts`, `lockedUntil`).
- **Timing Attack Mitigation**: Khi đăng nhập với tên người dùng không tồn tại trong hệ thống, server vẫn thực hiện một phép kiểm tra mật khẩu giả lập với `DUMMY_PASSWORD_HASH` để đảm bảo thời gian phản hồi đồng nhất, ngăn chặn kẻ tấn công dò tìm danh sách tài khoản hợp lệ (User Enumeration).
- **Proof-of-Work (PoW) Captcha**: Bảo vệ các form nhạy cảm (Đăng ký tài khoản, Quên mật khẩu) bằng thuật toán tính toán băm SHA256 phía client, chặn đứng bot tự động tạo tài khoản hàng loạt mà không tốn chi phí cho bên thứ ba.
- **Rate Limiting Đa Lớp**: Kiểm soát tần suất gọi API bằng `src/lib/rateLimit.ts` theo IP và theo định danh tài khoản:
  - API Login: Giới hạn 25 request / 5 phút trên IP và 15 request / 5 phút trên tài khoản.
  - API Submit: Giới hạn 12 request / phút trên User ID.
  - Tự động dọn dẹp các bucket hết hạn mỗi 60 giây để chống tràn RAM.

### 6.4. Bảo Mật Webhook & Cron Jobs
- **SePay Payment Webhook**:
  - Hỗ trợ xác thực kép: ApiKey header hoặc chữ ký HMAC-SHA256 (`X-SePay-Signature`).
  - Chữ ký được so sánh bằng `crypto.timingSafeEqual`, triệt tiêu lỗ hổng tấn công phân tích thời gian thực thi (Timing Attack).
- **Cron Jobs**: Toàn bộ các route cron nội bộ (`/api/cron/*`) bắt buộc phải có header `Authorization: Bearer <CRON_SECRET>`. Nếu không có hoặc sai bí mật, hệ thống từ chối ngay với mã lỗi HTTP 401.

### 6.5. Bảo Mật Lưu Trữ Tập Tin Cục Bộ (Path Traversal Protection)
- Trong `src/lib/localFileStorage.ts` và `/api/uploads/[...path]/route.ts`:
  - Mọi đường dẫn truy xuất file đều được giải quyết qua `path.resolve` và kiểm tra nghiêm ngặt `targetPath.startsWith(uploadsDir + path.sep)`.
  - Mọi nỗ lực chèn ký tự `../` hoặc bypass ký tự unicode đều bị phát hiện và chặn với mã lỗi HTTP 403 Forbidden.

### 6.6. Phòng Vệ Chiều Sâu CSRF & Same-Origin Fetch (`isBrowserSameOriginFetch`)
- **Phủ sóng toàn diện 67/68 route mutation**: Toàn bộ các API handler có khả năng làm thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) trong hệ thống (gồm 27 API Admin, 10 API Clan, API nộp bài/kỷ lục, đổi mật khẩu, cập nhật profile, quản lý thông báo, upload ảnh, site lock...) đều được tích hợp bộ kiểm tra `isBrowserSameOriginFetch(req)`.
- **Ngoại lệ duy nhất có chủ đích**: Endpoint webhook bên thứ 3 (`/api/webhooks/sepay`) nhận tín hiệu từ cổng thanh toán SePay bên ngoài nên không áp dụng same-origin, thay vào đó được bảo vệ bằng xác thực API Key hoặc chữ ký điện tử HMAC-SHA256 timing-safe.
- **Cơ chế hoạt động**: Phân tích header tiêu chuẩn hiện đại `Sec-Fetch-Site` (`cross-site` -> reject, `same-origin` -> accept), kết hợp kiểm tra độ khớp tuyệt đối giữa URL `Origin` / `Referer` với origin của server tiếp nhận. Tương thích linh hoạt với cả iOS Safari và in-app webview.

### 6.7. Hệ Thống Nhật Ký Kiểm Toán Quản Trị Cấp Cao (Admin Audit Logging)
- **Truy vết toàn diện hành vi nhạy cảm (`logAudit`)**: Mọi thao tác có tính chất thay đổi bảo mật hoặc xóa dữ liệu nghiêm trọng đều được ghi nhận vĩnh viễn vào bảng `AuditLog` kèm `userId`, `action`, `ipAddress` và `details` JSON:
  - `ADMIN_RESET_PASSWORD`: Ghi nhận Super Admin nào đặt lại mật khẩu cho tài khoản nào.
  - `SET_SITE_LOCK`: Ghi nhận trạng thái bật/tắt chế độ khoá khẩn cấp website.
  - `DISBAND_CLAN`: Ghi nhận thông tin người thực hiện, ID, tên và slug của Clan bị giải tán.
  - `DELETE_LEVEL`: Ghi nhận ID, tên màn chơi và GD Level ID bị xóa khỏi danh sách.
  - `BAN_USER` / `UNBAN_USER`, `UPDATE_USER_ROLE`: Ghi nhận thời gian, lý do và phân quyền mới.

---

## 7. BÁO CÁO TỐI ƯU HÓA HIỆU NĂNG & CODE (PERFORMANCE & OPTIMIZATION)

### 7.1. Tối Ưu Hóa Truy Vấn Cơ Sở Dữ Liệu (Database & Query Optimization)
1. **Pruning Trường Dữ Liệu (Field Pruning với `select`)**:
   - Tránh dùng `findMany` mà không giới hạn trường. Thay vào đó, sử dụng các hằng số select được định nghĩa sẵn như `publicUser`, `RECORD_SCORING_LEVEL_SELECT` trong `leaderboard.ts` và `recordUtils.ts` để chỉ lấy đúng các cột cần thiết, giảm tới 70% băng thông truyền tải giữa Database và Next.js.
2. **Khắc Phục Lỗ Hổng Truy Vấn N+1**:
   - Trong tính toán Clan SP (`syncAndGetClanSp`), thực hiện gom các câu lệnh tìm kiếm theo mảng `findMany({ where: { id: { in: ids } } })` thay vì chạy vòng lặp `for` gọi truy vấn tuần tự.
3. **Cơ Chế Dynamic Indexing**:
   - `ensureSchema.ts` tự động kiểm tra và khởi tạo các chỉ mục quan trọng: index cho `User.username`, `Clan.slug`, `Level.placement`, `Record.status` giúp tốc độ tìm kiếm và sắp xếp đạt độ phức tạp $O(\log N)$.

### 7.2. Tầng Bộ Nhớ Đệm (Caching Strategy)
1. **In-Memory Cache (`publicCache.ts`)**:
   - Dữ liệu Bảng xếp hạng và Danh sách màn chơi được lưu trữ trong bộ nhớ RAM của server với cơ chế thời gian sống (TTL).
   - Khi có sự kiện thay đổi dữ liệu (Duyệt kỷ lục, thêm level, thăng cấp Clan), hệ thống kích hoạt `bustPublicCache(CACHE_TAGS.LEADERBOARD)` để xóa cache có chủ đích, bảo đảm tính nhất quán dữ liệu mà không cần truy vấn DB liên tục.
2. **HTTP Cache Headers**:
   - Các tập tin ảnh tĩnh tải lên phục vụ qua `/api/uploads/*` được gắn header: `Cache-Control: public, max-age=31536000, immutable`, giúp trình duyệt và Cloudflare cache vĩnh viễn ở biên mạng (Edge), giảm tải tối đa cho VPS.

### 7.3. Tối Ưu Hóa Giao Diện & Client Bundle (Frontend & React Optimization)
1. **Chuyển Tab Không Reload (`pushState` thay vì `router.push`)**:
   - Tại các trang nhiều tab (`/levels`, `/leaderboard`), sử dụng `window.history.pushState` kết hợp indicator động của `AnimatedTabs`. Điều này ngăn Next.js remount lại component layout cha, giữ nguyên state giao diện và tạo hiệu ứng trượt 60fps mượt mà.
2. **Tính Toán Màu Sắc & Glow Luminous Hiệu Quả**:
   - Thuật toán `ensureLuminousGlowColor` trong `UserDisplayName.tsx` chuyển đổi màu trực tiếp từ HEX sang HSV và tính toán giá trị phát quang một lần duy nhất, không tạo ra các DOM elements ẩn hoặc bộ lọc SVG filter phức tạp gây tụt FPS khi render danh sách hàng trăm người chơi.
3. **Responsive Discord Member Sidebar**:
   - Trên màn hình Clan, sidebar Discord được tách thành component độc lập, chỉ fetch danh sách thành viên khi mở và tái sử dụng bộ nhớ cache profile người dùng.

---

## 8. QUY TRÌNH DEPLOY VÀ BẢO TRÌ PRODUCTION

- **Quy trình Triển Khai (`deploy.py`)**:
  1. Kết nối SSH vào VPS `103.231.248.235` (user: `root`).
  2. Kéo code mới nhất từ nhánh `main` của repo GitHub: `cd /var/www/gdvnc-web-main && git pull origin main`.
  3. Cài đặt dependency: `npm install`.
  4. Đồng bộ cơ sở dữ liệu: `npx prisma db push --accept-data-loss`.
  5. Biên dịch bản dựng tối ưu: `export NODE_OPTIONS="--max-old-space-size=1536" && npm run build`.
  6. Đồng bộ asset tĩnh sang thư mục standalone: copy `.env`, `public/`, và `.next/static/` vào `.next/standalone/`.
  7. Khởi động lại dịch vụ: `pm2 restart gdvn-web && pm2 status`.
- **Nhật ký triển khai**: Được ghi nhận tự động vào file `deploy.log` tại thư mục gốc của workspace.

---
*Tài liệu này được tạo tự động và đồng bộ trực tiếp với toàn bộ mã nguồn của dự án GDVN. Mọi AI Agent và kỹ sư phần mềm khi tham gia phát triển dự án có thể dựa hoàn toàn vào tài liệu này để định vị và giải quyết mọi tác vụ kỹ thuật một cách chính xác.*
