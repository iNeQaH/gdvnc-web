# Setup ủng hộ / Supporter

Chuyển khoản **không tự cộng role**. Admin đối soát nội dung rồi cấp trên profile.

## Nội dung chuyển khoản

Định dạng bắt buộc:

```
username - sốThángT
```

Ví dụ user `ineqah` mua 3 tháng: `ineqah - 3T`

Số tiền = `20.000đ × số tháng` (1 / 3 / 6 / 12).

Trang `/support`:

1. User phải **đăng nhập** (nút sẽ đưa tới `/login?next=/support`).
2. Chọn gói → **Chuyển khoản** mở app ngân hàng (`dl.vietqr.io`) hoặc hiện QR.
3. Bấm STK / nội dung để copy.
4. **Tôi đã chuyển khoản** → thông báo inbox admin + phiếu Help.

## Admin cấp role

1. Inbox admin hoặc tab Helps: tìm dòng `username · 3T · …đ · username - 3T`.
2. Mở `/profile/{username}` → quản lý (chỉ ADMIN).
3. Mục **Cấp / Gia hạn Supporter** → +1 / +3 / +6 / +12 tháng → lưu.
4. Hệ thống **cộng thêm** vào hạn hiện tại (không reset về hôm nay nếu còn hạn).

STK nhận: VietinBank `100879164042` — NGUYEN QUANG HIEP (`src/lib/supportPayment.ts`).

## User đã chuyển nhưng chưa có badge

Thường vì nội dung cũ chỉ là `GDVN 1T` (không có username) nên không khớp. Cấp tay: profile user → + đúng số tháng đã trả.
