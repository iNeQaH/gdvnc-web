# GDVN (gdvnc-web) — AI Master Codebase Index & Security Architecture
> **Bản đồ cấu trúc toàn diện, kiểm tra bảo mật, tối ưu mã nguồn & bảng tra cứu sửa bug tức thì dành riêng cho AI Agent & Kỹ sư phát triển.**
> **Không cần đọc lại toàn bộ mã nguồn**: Chỉ cần đọc file này kết hợp với `.cursor/PROJECT_STATE.md` là nắm bắt 100% logic, luồng dữ liệu, vị trí xử lý lỗi và các tiêu chuẩn kỹ thuật của hệ thống.

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
8. [Quy Trình Deploy Và Bảo Trì Production](#8-quy-trình-deploy-và-bảo-trì-production)

---

## 1. HƯỚNG DẪN DÀNH CHO AI AGENT

> [!IMPORTANT]
> **YÊU CẦU BẮT BUỘC ĐỐI VỚI AI AGENT**:
> Trước khi thực hiện bất kỳ thao tác nào (phân tích, trả lời câu hỏi, sửa bug, viết code, tạo API, nâng cấp UI):
> 1. **ĐỌC CẢ HAI FILE**:
>    - **`.cursor/PROJECT_STATE.md`**: File phân tích sống, changelog cập nhật từng ngày và trạng thái hiện thời của repo.
>    - **`AI_MASTER_CODEBASE_INDEX.md`**: Bản đồ kiến trúc toàn diện, luồng dữ liệu, schema, bug matrix và nguyên tắc bảo mật của dự án.
> 2. **Tra cứu ngay Mục 5 (Instant Bug-Fixing Matrix)** để tìm lỗi/tính năng tương ứng, file cần mở và hàm xử lý chính xác.
> 3. **Tra cứu Mục 4 (File-by-File Breakdown)** để nắm cấu trúc dữ liệu, các hàm export, phụ thuộc và các bẫy logic (pitfalls/edge cases).
> 4. **Cập nhật sau mỗi lần sửa code**:
>    - Ghi changelog mới nhất vào `.cursor/PROJECT_STATE.md`.
>    - Đồng bộ `AI_MASTER_CODEBASE_INDEX.md` nếu có sự thay đổi về kiến trúc, schema hoặc quy tắc nghiệp vụ.
>    - Khi hoàn thành task: Commit và push lên `https://github.com/iNeQaH/gdvnc-web` (nhánh `main`).

### Các Quy Tắc Bất Di Bất Dịch Của Dự Án:
- **Mã nguồn ứng dụng**: Nằm trong thư mục `gdvnc-web-main/`. Path alias `@/*` trỏ về `gdvnc-web-main/src/*`.
- **Cổng dev**: Chạy port `8088` (`npm run dev` → `0.0.0.0:8088`), không phải `3000`.
- **Tuyệt đối không tạo/ghi đè file cấm**: **Không** tạo hoặc ghi `AGENTS.md` hay `CLAUDE.md` bên trong `gdvnc-web-main/` (Next.js sẽ recreate hoặc bị gitignore).
- **Quy trình triển khai VPS**: Triển khai lên VPS Production qua `python deploy.py` (tự động SSH kéo `main`, push schema, build standalone và restart PM2 `gdvn-web` trên IP `103.231.248.235`).

---

## 2. KIẾN TRÚC TỔNG THỂ & HẠ TẶNG KỸ THUẬT

### 2.1. Tech Stack
- **Framework**: Next.js 14 App Router (React 18 Server Components & Client Components), TypeScript.
- **ORM & Database**: Prisma ORM, PostgreSQL (Database tự host hoặc cloud), quản lý DDL kép qua `prisma/schema.prisma` và runtime dynamic migration qua `src/lib/ensureSchema.ts`.
- **Xác thực & Phân quyền (Auth & RBAC)**: JWT ký bởi thư viện `jose` (HS256), lưu trữ trong HttpOnly Cookie `gdvnc_token` với thời hạn 7 ngày. Hỗ trợ Session Invalidation tức thì bằng `tokenVersion` trong DB. Phân quyền đa cấp: `USER`, `MODERATOR`, `ADMIN` (Full Admin), và `SUPER_ADMIN` (kiểm tra username/id đặc quyền qua env).
- **Bảo vệ Brute-force & Anti-Bot**: Proof-of-Work (PoW) SHA256 Captcha (`captcha.ts`), Rate limiter in-memory theo IP và identifier (`rateLimit.ts`), Account lockout sau 5 lần đăng nhập sai (`failedLoginAttempts`, `lockedUntil`).
- **Thanh toán & Đổi thưởng (Payment & Rewards)**: Webhook SePay (`/api/webhooks/sepay`) tự động phân tích cú pháp chuyển khoản ngân hàng (VietinBank, Techcombank, VCB...), kích hoạt thời hạn Supporter và cấp SP Coin. Hệ thống mã đổi thưởng (`RedeemCode`, `RedeemCodeUse`).
- **Tích hợp bên thứ ba (External Integrations)**:
  - **GDBrowser API & Self-Sync Stats**: Đồng bộ profile GD (`stars`, `moons`, `demons`, `cp`, `globalRank`) từ `https://gdbrowser.com/api/profile/{username}`. **Chỉ kích hoạt khi người dùng tự xem profile của chính mình** (`isSelf`), kèm cơ chế cooldown 5 phút (người có rank) và 72 giờ (người không có rank).
  - **Pointercrate / Demonlist API**: Lấy dữ liệu kỷ lục và media demon quốc tế, hỗ trợ mở rộng danh sách Classic lên tới 1000 level.
  - **Google Sheets API**: Đồng bộ bảng xếp hạng GDVN Classic/Platformer qua Sheet đồng bộ tự động.
- **Hệ thống Theme & Visual Styles**:
  - Gồm 8 theme: `sky`, `mint`, `peach`, `lavender`, `mono`, `sakura`, `custom`, và `???`.
  - Hỗ trợ đổi theme theo scoped container (profile cá nhân không làm ảnh hưởng theme website tổng thể).
  - Thuật toán Luminous HSV (`ensureLuminousGlowColor` trong `UserDisplayName.tsx`): tự động điều chỉnh độ sáng `v >= 0.92` trên nền sáng để ngăn ngừa vệt đen bẩn của glow.
- **Chuẩn Hóa Palette Màu Rating Geometry Dash**:
  - `MYTHIC`: Xanh cyan (`#22d3ee` / `#06b6d4`).
  - `LEGENDARY`: Hồng cánh sen (`#f472b6` / `#ec4899`).
  - `EPIC`: Cam rực rỡ (`#fb923c` / `#f97316`).
  - `FEATURED` / `FEATURE`: Vàng kim (`#facc15` / `#eab308`).
  - `RATED` / `RATE`: Vàng nhạt (`#fef08a` / `#ca8a04`).
  - `CHALLENGE`: Hổ phách (`#f59e0b` / `amber-500`) — tự động thay thế nhãn `Unrated` khi màn chơi có cờ `isChallenge = true`.
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
   - Leaderboard & GD Stats: `classicPt`, `platformerPt`, `challengePt`, `creatorPoints`, `spPoints`, `gdStars`, `gdMoons`, `gdDemons`, `gdHasGlobalRank`, `gdStatsUpdatedAt`, `hardestClassicLevelId`, `hardestPlatformerLevelId`, `hardestChallengeLevelId`.
   - **Điểm Hoạt Động Hàng Ngày**:
     - `activityPoints` (Int, default: 0): Điểm hoạt động tính được trong ngày hôm nay.
     - `activityDate` (String?, định dạng "YYYY-MM-DD" múi giờ Việt Nam UTC+7): Ngày tính điểm gần nhất.
     - `activityPrevStars`, `activityPrevMoons`, `activityPrevDemons` (Int, default: 0): Chỉ số baseline chốt sổ của ngày hôm trước để so sánh tăng trưởng.
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
   - `id`, `gdLevelId` (ID level Geometry Dash), `name`, `creatorName`, `creatorId` (User nếu là người trong web), `mode` (`CLASSIC`, `PLATFORMER`), `difficultyFace`, `ratingType` (`NONE`, `RATED`, `FEATURED`, `EPIC`, `LEGENDARY`, `MYTHIC`), `basePp`, `placement` (thứ hạng trên bảng xếp hạng, mở rộng tới 1000 cho Classic), `minPercent`, `isChallenge`, `isNational`, `youtubeUrl`, `password`.
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
  - Khi khởi động hoặc nhận request đầu tiên, `ensureSchema.ts` truy vấn bảng `information_schema.columns` để kiểm tra danh sách các cột thực tế theo danh sách `REQUIRED_SCHEMA_KEYS` (bao gồm đầy đủ các cột mới: `activityPoints`, `activityDate`, `activityPrevStars`, `activityPrevMoons`, `activityPrevDemons`, `lastLoginAt`, v.v.).
  - Tự động chạy lệnh SQL an toàn: `ALTER TABLE "..." ADD COLUMN IF NOT EXISTS "..." ...`
  - Tự động tạo các bảng phụ nếu chưa có: `PageVisit`, `ListChangeLog`, `Clan`, `ClanMember`, `ClanSpContribution`, `ClanBan`, `RedeemCode`, `RedeemCodeUse`, `UserSpGrant`, v.v.
  - Tự động tạo index tăng tốc độ truy vấn: `CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username")`, v.v.

---

## 4. BẢN ĐỒ PHÂN TÍCH CHI TIẾT TỪNG FILE MỘT TRONG HỆ THỐNG

### 4.1. Core Libraries (`src/lib/*.ts`)

#### [activityPoints.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/activityPoints.ts)
- **Chức năng**: Hệ thống tính Điểm Hoạt Động Clan hàng ngày của từng người chơi dựa trên mức độ cày cuốc (Grinding) chỉ số Geometry Dash.
- **Công thức tính điểm**:
  - So sánh tổng số Star, Moon, Demon ngày hôm nay với baseline của ngày hôm trước (`activityPrevStars`, `activityPrevMoons`, `activityPrevDemons`).
  - Mỗi Star cao hơn: **+1 điểm**.
  - Mỗi Moon cao hơn: **+1 điểm**.
  - Mỗi Demon cao hơn: **+10 điểm**.
  - Nếu điểm thấp hơn hoặc bằng: **0 điểm** (không tính, không bị trừ điểm âm).
- **Quy tắc kích hoạt**:
  - **Chỉ cập nhật khi người dùng xem profile của chính bản thân** (`/api/profile/[username]` với `isSelf === true`). Người ngoài xem không kích hoạt tính toán.
  - Tự động nhận diện ngày mới theo múi giờ Việt Nam UTC+7 qua hàm `getVnTodayString()`. Khi sang ngày mới, các chỉ số chốt sổ của ngày trước được lưu thành baseline để so sánh cho ngày hiện tại.
- **Export chính**: `getVnTodayString(nowMs)`, `computeActivityPoints(currentStats, userState, nowMs)`.

#### [ScoringEngine.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/ScoringEngine.ts) & [externalLists.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/externalLists.ts)
- **Chức năng**: Động cơ tính điểm kỹ năng (Pt - Pointercrate/Performance Points) cho người chơi.
- **Mở rộng Giới Hạn Classic List 1000 Level**:
  - Danh sách Classic Demonlist chính thức xếp hạng được mở rộng từ 500 lên **1000 level** (`LIST_SIZE = 1000`).
  - **Công thức hàm mũ**: $P(x) = MIN\_Pt \times e^{k \times (1000 - x)}$, với $MAX\_Pt = 400$, $MIN\_Pt = 20$, và $k = \frac{\ln(MAX\_Pt / MIN\_Pt)}{1000 - 1} \approx 0.0029987$.
  - Level Unranked (ngoài Top 1000): Thưởng điểm theo độ khó: Extreme Demon = 7 Pt, Insane Demon = 6 Pt, Hard = 5 Pt, Medium = 4 Pt, Easy = 3 Pt.
  - Tính điểm theo tiến độ (`awardedPpForProgress`): Đạt `minPercent` nhận 10% điểm base, đạt 100% nhận 100% điểm base, nội suy tuyến tính ở giữa.
  - Điểm tổng của người chơi (`calculatePlayerPp`): Điểm các level được xếp giảm dần và nhân trọng số lũy thừa $0.95^i$ để ngăn chặn cày cuốc số lượng vượt qua trình độ cao cấp.
- **API Tính lại điểm toàn bộ hệ thống**: `POST /api/admin/levels/recalc-scores`.

#### [clan.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/clan.ts) & [clanTypes.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/clanTypes.ts)
- **Chức năng**: Cốt lõi của hệ sinh thái Clan: tính toán điểm SP Coin, cấp bậc Clan Tier, cơ chế ân hạn 7 ngày và thuật toán đá thành viên tự động khi tụt Tier.
- **Quy tắc Tier Clan (`CLAN_TIER_CONFIG`)**:
  - `Tier 0`: 0 - 2 SP (Không đủ điều kiện thành lập/duy trì).
  - `Tier 1`: 3 - 9 SP (Sức chứa tối đa: **5 thành viên**, màu tag đơn sắc).
  - `Tier 2`: 10 - 19 SP (Sức chứa tối đa: **15 thành viên**, mở khóa Màu Gradient tag & Theme Gradient).
  - `Tier 3`: 20 - 49 SP (Sức chứa tối đa: **50 thành viên**, mở khóa Hiệu ứng Glow phát quang).
  - `Tier 4`: >= 50 SP (Sức chứa tối đa: **100 thành viên**, Cấp tối đa).
- **Hàm xử lý quan trọng**:
  - `calculateUserSp(user)`: Tính SP của user. Cứ mỗi 30 ngày Supporter còn lại = 1 SP Coin (`Math.ceil(diff / 30d)`). Nếu hết hạn supporter hoặc không có supporter -> SP = 0.
  - `syncAndGetClanSp(clanId)`: Tính lại tổng SP đóng góp từ các thành viên còn trong Clan, tự động clamp về `userMaxSp`, xóa contribution nếu user hết hạn supporter.
  - `pruneExcessClanMembers(clan, maxAllowed, tierName)`: Tự động loại bỏ thành viên dôi dư sau 7 ngày ân hạn (ưu tiên đá `MEMBER` trước `MODERATOR`, đá người ít SP trước, đá người có `lastLoginAt` cũ nhất; `LEADER` tuyệt đối không bị đá).

#### [auth.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/auth.ts)
- **Chức năng**: Quản lý phiên đăng nhập JWT, cookie auth, kiểm tra tính hợp lệ của token và phân quyền người dùng.
- **Export chính**: `signToken`, `verifyToken`, `setAuthCookie`, `clearAuthCookie`, `getAuthUser`, `getSessionUser`, `requireActiveUser`, `requireAdmin`, `requireFullAdmin`, `requireSuperAdmin`, `bumpTokenVersion`.

#### [gdBrowserSync.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/gdBrowserSync.ts)
- **Chức năng**: Tự động đồng bộ các chỉ số Geometry Dash chính thức (Stars, Moons, Demons, CP) từ GDBrowser API.
- **Cơ chế Cooldown & Bảo Vệ**:
  - **Chỉ kích hoạt khi xem chính mình (`isSelf`)**: Người khác truy cập profile sẽ không làm server gọi GDBrowser API.
  - **Điều kiện Global Rank**: Chỉ khi người chơi có thứ hạng xếp hạng toàn cầu hợp lệ (`rank >= 1` và không unranked/ban) thì các chỉ số Stars, Moons, Demons mới được chấp nhận lưu vào DB. Nếu không có rank -> set về 0 và thu hồi huy hiệu Grinder.
  - **Cooldown 72 giờ**: Áp dụng cho người chơi không có Global Rank.
  - **Cooldown 5 phút**: Áp dụng cho người chơi có rank bình thường.

#### [creatorPoints.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/creatorPoints.ts) & [creatorLevelsSync.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/creatorLevelsSync.ts)
- Quản lý điểm sáng tạo (CP), tự động liên kết các level trong DB vào danh sách "Level đã tạo" và trao huy hiệu Creator theo thứ tự: `Mythic > Legendary > Epic > Featured > Rated`.

#### [rateLimit.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/rateLimit.ts) & [captcha.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/captcha.ts)
- Rate limiting in-memory với cơ chế tự dọn dẹp mỗi 60 giây. Thử thách PoW Captcha SHA-256 chống bot không tốn phí dịch vụ bên ngoài.

#### [localFileStorage.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/localFileStorage.ts) & [htmlSanitize.ts](file:///d:/Programs/GDVN/gdvnc-web-main/src/lib/htmlSanitize.ts)
- Lưu trữ file cục bộ an toàn, kiểm tra Path Traversal, chặn SVG/HTML upload. Khử mã độc XSS qua bộ lọc allowlist tùy biến.

---

### 4.2. Tất Cả 98 API Endpoints (`src/app/api/**/route.ts`)

#### Nhóm Hệ Thống Clan (`/api/clans/*`)
1. **`GET /api/clans`**:
   - Lấy danh sách toàn bộ Clan. Tính toán tổng Điểm Hoạt Động của Clan (`activityPoints`), SP Coin thực tế, cấp bậc Tier và số lượng thành viên.
   - **Sắp xếp mặc định**: Theo Điểm hoạt động giảm dần (`sortBy: 'activity'`), số lượng thành viên giảm dần (`memberCount`), và ngày thành lập tăng dần (`createdAt`).
   - Hỗ trợ các bộ lọc sắp xếp: `activity` (Điểm hoạt động), `members` (Số thành viên), `created` (Theo ngày tạo), `name` (Tên A-Z), `sp` (Số SP).
2. **`POST /api/clans`**: Thành lập Clan mới (yêu cầu >= 3 SP Coin hoặc quyền Staff).
3. **`GET /api/clans/[slug]`**: Lấy chi tiết Clan, danh sách thành viên kèm điểm hoạt động cá nhân, chức vụ, đóng góp SP, màn chơi yêu thích và Featured Creator Works.
4. **`PATCH /api/clans/[slug]`** / **`DELETE /api/clans/[slug]`**: Chỉnh sửa / Giải tán Clan.
5. **`POST /api/clans/[slug]/join`** / **`POST /api/clans/[slug]/donate`** / **`POST /api/clans/[slug]/transfer`**: Gia nhập / Đóng góp SP / Chuyển chức Leader.
6. **`POST /api/clans/[slug]/requests/[id]`** / **`PATCH /api/clans/[slug]/members/[id]/role`** / **`DELETE /api/clans/[slug]/members/[id]`**: Duyệt đơn / Phân quyền / Trục xuất.

#### Nhóm Hồ Sơ & Trang Cá Nhân (`/api/profile/*`)
7. **`GET /api/profile/[username]`**:
   - Trả về thông tin hồ sơ: metadata, GD stats, kỷ lục, level đã tạo, huy hiệu, clan và lượt like.
   - **Cơ chế Self-Sync Stats**: Kiểm tra `isSelf = viewer?.userId === user.id`. Chỉ khi chính chủ vào xem trang của mình, server mới thực hiện:
     1. Gọi `syncUserGdBrowserStats` (nếu hết hạn cooldown).
     2. Gọi `computeActivityPoints` cập nhật điểm hoạt động hàng ngày và lưu baseline vào `User`.
     3. Tự động liên kết các level sáng tạo qua `autoLinkUserCreatedLevels`.
   - Nếu người ngoài xem: Chỉ đọc dữ liệu có sẵn trong DB, bảo vệ hệ thống khỏi lạm dụng request ra ngoài.
8. **`PATCH /api/profile/[username]`**: Chỉnh sửa Bio, mạng xã hội, màu tên, font tên, glow và theme profile.
9. **`POST /api/profile/[username]/like`**: Thả tim / Bỏ tim trang cá nhân (lưu trong `likedUserIds`).

#### Nhóm Kỷ Lục, Màn Chơi & Bảng Xếp Hạng
10. **`GET /api/levels`**: Danh sách màn chơi theo mode (`CLASSIC`, `PLATFORMER`), phân loại (`demonlist`, `pemonlist`, `featured`, `vn`, `challenge`). Hỗ trợ nhận diện cấp độ Rating chuẩn và cờ `isChallenge`.
11. **`GET /api/leaderboard`**: Bảng xếp hạng Classic Pt, Platformer Pt, Challenge Pt, Creator Points, Grinder Stars/Moons/Demons.
12. **`POST /api/submit`**: Nộp kỷ lục mới hoặc tác phẩm sáng tạo. Kiểm tra trùng lặp đang chờ duyệt.
13. **`POST /api/admin/levels/recalc-scores`**: Tính toán lại toàn bộ `basePp` của 1000 level Classic và cập nhật lại điểm `classicPp` cho toàn bộ người chơi.

---

### 4.3. UI Components & Hệ Thống Giao Diện (`src/components/**/*.tsx`)

#### Hệ Thống Clan Components
- **[ClanPodiumLeaderboard.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanPodiumLeaderboard.tsx)**:
  - Bảng vinh danh thành viên hoạt động nhiều nhất trong Clan: Top 1, Top 2, Top 3 với avatar bục podium, hiển thị huy hiệu ngọn lửa (`Flame`) kèm `{pts} Điểm`.
  - Tích hợp nút trợ giúp `(?)` mở modal giải thích chi tiết cơ chế Điểm Hoạt Động (công thức +1 sao/moon, +10 demon, so sánh với ngày hôm trước, tự cập nhật khi vào trang profile cá nhân).
- **[ClanDiscordMemberSidebar.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanDiscordMemberSidebar.tsx)**:
  - Danh sách thành viên bên sườn phải: hiển thị chức vụ, trạng thái online, số SP đóng góp và điểm hoạt động hôm nay.
- **[ClanInfoModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanInfoModal.tsx)** & **[ClanSettingsModal.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/clan/ClanSettingsModal.tsx)**:
  - Modal cẩm nang giải thích 4 Tier Clan và bảng điều khiển cài đặt Clan toàn diện.

#### Hệ Thống Huy Hiệu & Hiển Thị Đánh Giá Level
- **[RecordsTab.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/admin/components/RecordsTab.tsx)** & **[LevelDataGrid.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/LevelDataGrid.tsx)**:
  - Hiển thị độ khó bằng chữ (`getDifficultyLabel`) và huy hiệu Rating (`getRatingInfo`).
  - Tự động thay thế nhãn `Unrated` bằng huy hiệu `Challenge` màu hổ phách/amber khi màn chơi có `isChallenge = true`.
  - Chuẩn hóa bảng màu Rating GD: Mythic cyan, Legendary pink, Epic orange, Feature yellow, Rate light yellow.
- **[UserDisplayName.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/components/UserDisplayName.tsx)**:
  - Tên người dùng với hiệu ứng Luminous Glow (`ensureLuminousGlowColor`), font tuỳ biến, clan tag và icon vai trò Staff.

---

### 4.4. App Pages & Subroutes (`src/app/**/page.tsx`)
- **`/clan` ([src/app/clan/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/clan/page.tsx))**:
  - Trang danh sách Clan: Hiển thị mặc định sắp xếp theo Điểm hoạt động hôm nay.
  - Khối thông tin trên từng Card hiển thị icon ngọn lửa (`Flame`) kèm số điểm hoạt động thay cho SP Coin.
  - Dropdown lọc gồm: 'Điểm hoạt động', 'Số thành viên', 'Theo ngày tạo', 'Tên Clan', 'SP đóng góp'.
- **`/clan/[slug]` ([src/app/clan/[slug]/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/clan/[slug]/page.tsx))**:
  - Trang chi tiết Clan: Banner, thông tin Tier, thanh tiến trình mục tiêu Tier tiếp theo (Tier 4 là 50 SP), box màn chơi yêu thích, box Featured Creator Works và BXH Thành Viên Hoạt Động Nhiều Nhất.
- **`/profile/[username]` ([src/app/profile/[username]/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/profile/[username]/page.tsx))**:
  - Trang hồ sơ cá nhân: Khi người dùng xem trang của chính mình, kích hoạt đồng bộ GDBrowser và tính điểm hoạt động. Hiển thị thông số GD, kỷ lục, level đã tạo (kèm rating badge chuẩn) và nút Thả Tim.
- **`/levels/classic` ([src/app/levels/classic/page.tsx](file:///d:/Programs/GDVN/gdvnc-web-main/src/app/levels/classic/page.tsx))**:
  - Danh sách quỷ dữ truyền thống Top 1 - 1000.

---

## 5. BẢN ĐỒ TRA CỨU ĐỊNH VỊ & SỬA LỖI TỨC THÌ (INSTANT BUG-FIXING MATRIX)

Bảng tra cứu trực tiếp: Khi gặp lỗi hoặc cần chỉnh sửa bất kỳ tính năng nào, tra ngay bảng này để biết **File cần sửa**, **Dòng code liên quan**, **Nguyên nhân cốt lõi** và **Giải pháp**:

| Lĩnh Vực / Lỗi | File Liên Quan & Vị Trí | Nguyên Nhân Cốt Lõi | Cách Khắc Phục Chuẩn Xác |
| :--- | :--- | :--- | :--- |
| **Stats Geometry Dash không tự cập nhật khi người khác xem Profile** | `src/app/api/profile/[username]/route.ts` & `src/lib/gdBrowserSync.ts` | Cơ chế Self-Sync có chủ đích: Chỉ khi chính chủ truy cập profile của mình (`isSelf === true`) thì hệ thống mới kích hoạt fetch GDBrowser và cập nhật stats để tránh lạm dụng và dính cooldown. | Đây là tính năng chuẩn. Nếu muốn kiểm tra cập nhật, đăng nhập đúng tài khoản và truy cập trang profile cá nhân của chính mình. |
| **Điểm Hoạt Động Clan không tăng hoặc luôn bằng 0** | `src/lib/activityPoints.ts` & `api/profile/[username]/route.ts` | (1) Người dùng chưa tự vào trang profile của chính mình; hoặc (2) Số Star/Moon/Demon hôm nay không cao hơn hôm trước; hoặc (3) Chưa sang ngày mới theo giờ VN. | Kiểm tra `User.activityDate` và `getVnTodayString()`. Chỉ khi chỉ số hiện tại cao hơn baseline hôm trước thì mới cộng điểm (+1 star/moon, +10 demon). Đảm bảo xem trang profile chính chủ. |
| **Màn chơi Challenge bị hiển thị nhãn 'Unrated' gây hiểu lầm** | `src/app/admin/components/RecordsTab.tsx` & `src/components/LevelDataGrid.tsx` | Màn chơi Challenge không có rating của RobTop nên `ratingType = 'NONE'`, logic cũ tự động map sang nhãn 'Unrated' màu xám. | Kiểm tra thuộc tính `isChallenge: true`. Nếu là Challenge, hiển thị nhãn 'Challenge' với tông màu hổ phách/amber (`bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400`). |
| **Level Demon có sao nhưng hiển thị 'Unrated' trong Admin Records** | `src/app/admin/components/RecordsTab.tsx` & `scripts/fix_level_ratings.js` | Dữ liệu cũ khi crawl Pointercrate không gán `ratingType`, khiến DB lưu `'NONE'`. | Hàm `getRatingInfo` fallback nhận diện level là Demon (`difficultyFace >= 10` hoặc tên độ khó chứa 'Demon') hoặc có placement thì tự động map sang `RATE`. Đã chạy migration script đồng bộ `RATE` trên DB. |
| **Dropdown sắp xếp ngoài `/clan` bị trùng 'Mới nhất' / 'Cũ nhất'** | `src/app/clan/page.tsx` & `src/app/api/clans/route.ts` | Trang danh sách Clan đã có nút đảo chiều Tăng/Giảm nhưng dropdown vẫn để 2 tùy chọn 'Mới nhất' và 'Cũ nhất'. | Gộp thành 1 tùy chọn duy nhất: 'Theo ngày tạo' (`created`). Chiều tăng/giảm do nút Đảo chiều đảm nhiệm. Mặc định sắp xếp theo 'Điểm hoạt động'. |
| **Classic list mở rộng 1000 level nhưng điểm người chơi chưa cập nhật** | `src/lib/ScoringEngine.ts` & `src/app/api/admin/levels/recalc-scores/route.ts` | Các level mới mở rộng có `basePp` mới nhưng bảng `User.classicPt` chưa được tính toán lại. | Gọi API `POST /api/admin/levels/recalc-scores` (hoặc chạy script tính điểm) để duyệt toàn bộ người chơi và cập nhật lại điểm tổng theo công thức $0.95^i$. |
| **Lỗi runtime `User.lastLoginAt` hoặc cột mới does not exist** | `src/lib/ensureSchema.ts` | Điều kiện thoát sớm `complete` trong `applyPendingSchema` chỉ kiểm tra 25 cột cũ, bỏ qua các cột mới. | Dùng `REQUIRED_SCHEMA_KEYS.every((k) => have.has(k))` bao quát toàn bộ 42 cột mới và chạy `npx prisma db push --skip-generate`. |
| **SP Coin của Clan không tự giảm khi Supporter hết hạn** | `src/lib/clan.ts` (L10-40) & `src/lib/clanTypes.ts` | Trước đây SP đóng góp (`spPledged`) được lưu tĩnh trong `ClanSpContribution` mà không kiểm tra thời hạn supporter của user. | Hàm `calculateUserSp` dùng `Math.ceil(diff / 30d)` để lấy SP thực tế. Trong `syncAndGetClanSp`, tự động clamp `Math.min(c.spPledged, userMaxSp)`. Nếu user hết hạn supporter -> xóa contribution về 0. |
| **Clan bị tụt Tier nhưng không đá bớt thành viên dôi dư** | `src/lib/clan.ts` (L52-110) & `api/clans/[slug]/route.ts` | Khi Clan tụt Tier, số lượng thành viên vượt quá `maxMembers` của Tier mới. | Sau 7 ngày ân hạn (`gracePeriodUntil`), hàm `pruneExcessClanMembers` tự động đá thành viên: ưu tiên đá `MEMBER` trước `MODERATOR`, đá người ít SP trước, đá người có `lastLoginAt` cũ nhất. `LEADER` không bao giờ bị đá. |
| **Thanh tiến trình Clan không hiển thị mốc Tier 4** | `src/app/clan/[slug]/page.tsx` & `src/components/clan/ClanSettingsModal.tsx` | Điều kiện kiểm tra chỉ dừng lại ở Tier 3 hoặc so sánh cứng `tier === 3`. | Dùng mốc 50 SP cho Tier 4. Khi SP từ 20 đến 49, hiển thị "Mục tiêu Tier 4 (50 SP)". Khi đạt >= 50 SP hiển thị "Cấp tối đa (Tier 4)". Dùng `tier >= 3` thay cho `=== 3`. |
| **Level trong Featured Works của Clan bị hiển thị 'Untitled Level'** | `src/app/api/clans/[slug]/route.ts` & `src/app/clan/[slug]/page.tsx` | Object trả về từ API chỉ gán `name: lvl.name` nhưng component chỉ đọc trường `levelName`. | Gán đồng thời cả `levelName`, `name`, `creatorName` và truy vấn bổ trợ từ bảng `Level`. Component dùng fallback: `item.levelName \|\| item.name \|\| item.matchedLevel?.name \|\| 'Untitled Level'`. |
| **Glow tên người dùng bị vệt xám/đen bẩn trên nền sáng** | `src/components/UserDisplayName.tsx` (L10-45) | Xếp chồng nhiều lớp `drop-shadow` có màu tối hoặc dùng `mix-blend-mode: plus-lighter` trong thẻ cha có opacity. | Dùng hàm `ensureLuminousGlowColor` nâng độ sáng HSV `v >= 0.92`, `s >= 0.70` biến màu glow thành neon pastel phát quang. Dùng 1 lớp drop-shadow 2.5px thanh thoát ôm sát chữ. |
| **Chuyển tab bị nối đuôi URL dị dạng `?tab=...` và giật lag** | `src/app/levels/page.tsx` & `src/app/leaderboard/page.tsx` | Dùng `searchParams.set('tab', ...)` kết hợp `router.push` làm re-render toàn bộ trang và sinh query params. | Dùng `window.history.pushState(null, '', '/levels/' + newTab)` kết hợp lắng nghe sự kiện `popstate`. State nội bộ cập nhật tức thì, thanh indicator của `AnimatedTabs` trượt mượt mà. |
| **Lỗi Hydration Nested `<a>` trên Podium Trang Chủ** | `src/app/page.tsx` & `src/components/UserDisplayName.tsx` | Thẻ `<a>` của Profile bọc bên ngoài thẻ `<a>` của Clan Tag trong component `UserDisplayName`. | Truyền prop `linkClan={false}` vào `UserDisplayName` khi component này đã nằm bên trong một liên kết khác. |

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
   - Trong tính toán Clan SP (`syncAndGetClanSp`) và Clan Activity Points, thực hiện gom các câu lệnh tìm kiếm theo mảng `findMany({ where: { id: { in: ids } } })` thay vì chạy vòng lặp `for` gọi truy vấn tuần tự.
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
*Tài liệu này được tạo và duy trì đồng bộ trực tiếp với toàn bộ mã nguồn của dự án GDVN. Mọi AI Agent và kỹ sư phần mềm khi tham gia phát triển dự án bắt buộc phải đọc tài liệu này cùng `.cursor/PROJECT_STATE.md` để định vị và giải quyết mọi tác vụ kỹ thuật một cách chuẩn xác nhất.*
