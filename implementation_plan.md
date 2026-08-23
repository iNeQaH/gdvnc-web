# Mục tiêu
- Hỗ trợ Xóa User và Xóa Kỷ lục trong trang Admin.
- Cải tiến trang Danh sách Demon (Demonlist) để quản lý Level qua Level ID.
- Lấy thumbnail tự động từ Video Showcase.
- Click vào Level trong danh sách sẽ mở ra trang chi tiết Level kèm danh sách người hoàn thành (như osu! beatmap).

## Thay đổi dự kiến
### 1. Trang Admin
- Thêm nút "Xóa User" trong modal Phân quyền / Quản lý User (cần cẩn thận xóa cả các bản ghi liên quan của user).
- Thêm tab hoặc nút để hiển thị các Kỷ lục đã duyệt của một User và cho phép xóa.
- Xây dựng API `/api/admin/users/[id]` method DELETE.
- Xây dựng API `/api/admin/records/[id]` method DELETE.

### 2. Quản lý Level bằng ID (Demonlist / Admin)
- Ở trang Admin, thêm form tạo Level bằng ID. Tự động lấy tên Level, thêm Description, và link Video Showcase.
- API lấy Thumbnail từ YouTube / Twitch (ví dụ `https://img.youtube.com/vi/ID/hqdefault.jpg`).
- Lưu Thumbnail URL vào model `Level`.
- Hiển thị Thumbnail làm background ở từng item trong `src/app/demons/page.tsx`.

### 3. Trang Chi tiết Level
- `src/app/demons/[id]/page.tsx`: Giao diện chi tiết màn chơi.
- Hiển thị thông tin màn chơi, video showcase.
- Liệt kê những người chơi đã vượt qua (thời gian, attempts, link video kỷ lục).

## Câu hỏi / Xác nhận từ người dùng
- Bạn có muốn tự động đồng bộ tên Level từ Geometry Dash server khi nhập ID không, hay Admin sẽ tự gõ tên Level? (Hiện tại app chưa có API GD server, nên mình có thể làm ô điền tay hoặc tích hợp API GDBrowser).
- Chức năng Xóa User sẽ xóa toàn bộ kỷ lục, level họ đã nộp, và điểm SP. Bạn có chắc chắn muốn xóa mềm (ẩn) hay xóa cứng (xóa hoàn toàn khỏi database)?
