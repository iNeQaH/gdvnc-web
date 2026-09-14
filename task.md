# Tiến độ thực hiện Kế hoạch Nâng Cấp Hệ Thống

- [x] Tối ưu Hoá bộ nhớ & Database (OOM & Data Consistency)
  - [x] Refactor `src/app/api/admin/analytics-data/route.ts` để sử dụng Database grouping thay vì In-memory.
  - [x] Thêm `$transaction` vào `src/app/api/admin/records/[id]/route.ts`.
  - [x] Khắc phục N+1 query trong `src/lib/externalLists.ts`.
  - [x] Rà soát và thay thế `$executeRawUnsafe` bằng `$executeRaw` (Parameterized queries).
- [x] Bảo mật
  - [x] Thêm cơ chế kiểm tra CSRF (Origin/Referer) cho các API thay đổi dữ liệu.
- [x] Kiến trúc & Refactor Code
  - [x] Xoá bỏ hoàn toàn thư mục `gdvn-api/`.
  - [x] Chia nhỏ "God component" `src/app/admin/page.tsx` thành các component con (`src/app/admin/components/`).
- [x] Xác minh & Kiểm thử (Build & Verify)
  - [x] Build dự án bằng `npm run build`
  - [x] Cập nhật `PROJECT_STATE.md`
