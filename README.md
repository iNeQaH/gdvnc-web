# GDVN — chạy local

Trang Geometry Dash Việt Nam. Production: https://gdvnc-web.vercel.app

App Next.js trong thư mục này, cổng **8088** (không phải 3000).

## Cần có

1. **Node.js 20+** (LTS): https://nodejs.org
2. **PostgreSQL** — Neon production, hoặc Postgres cài máy / Docker:
   ```bash
   docker run --name gdvn-pg -e POSTGRES_PASSWORD=gdvn -e POSTGRES_DB=gdvn -p 5432:5432 -d postgres:16
   ```
   Khi đó:
   ```
   DATABASE_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
   DIRECT_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
   ```

## Cài lần đầu

1. Copy `.env.example` thành `.env.local` và điền `DATABASE_URL` + `DIRECT_URL`.
2. Mở terminal trong thư mục này (`package.json` nằm đây).
3. Chạy **`start.bat`** (Windows) hoặc:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```
4. Mở http://localhost:8088

`start.bat` / `start.ps1` tự `npm install` nếu chưa có `node_modules`, rồi `npm run dev`.

Tạo lại Prisma client nếu schema đổi:

```bash
npx prisma generate
```

Đồng bộ bảng lên DB local (không dùng migrate Vercel):

```bash
npx prisma db push
```

## “Offline” nghĩa là gì

Đây là **chạy máy bạn**, không phụ thuộc Vercel. Một số chức năng vẫn cần mạng:

| Việc | Mạng? |
|------|--------|
| Xem BXH / list đã có trong DB | Không |
| QR chuyển khoản VietQR, GDBrowser, GDListHub, Google Sheet, UploadThing, OTP mail | Có |

Không có `DATABASE_URL` thì hầu hết API trả 500.

## Tắt server

Cửa sổ `start.bat`: **Ctrl+C**.

## Sau khi chạy xong

Đăng nhập admin trên local chỉ khi DB local có user đó (Neon production ≠ DB trống mới `db push`). Muốn data thật: trỏ `DATABASE_URL` tới Neon (cần mạng).
