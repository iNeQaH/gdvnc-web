# GDVNC - Walkthrough

## Cập nhật gần đây

### 1. Fix Lỗi Font Tiếng Việt & Avatar Sidebar
- **Sự cố:** Chạy bash PowerShell làm vỡ font (Mojibake).
- **Cách sửa:** Khôi phục file bị lỗi `admin/page.tsx` và `demons/page.tsx` thông qua giải mã ngược từ `latin1`, sau đó thay thế nốt các file còn lại bằng Node.js regex. Đảm bảo file không dính ký tự lạ (BOM).
- **Avatar Sidebar:** Sử dụng Custom Event `window.dispatchEvent(new Event('gdvnc_user_update'))` tại Profile Page để bắn tín hiệu sang Sidebar, giúp Avatar tự động cập nhật mà không cần F5.

### 2. Quản Lý Kỷ Lục và Xóa User (Admin)
- **API `DELETE /api/admin/users/[id]`**: Sử dụng Prisma transaction để xóa các Kỷ lục của User, reset Reviewer, sau đó Xóa tài khoản vĩnh viễn khỏi CSDL.
- **API `DELETE /api/admin/records/[id]`**: Xóa kỷ lục bất kỳ. Hệ thống sẽ **tự động tính toán lại** Points cho người chơi nếu kỷ lục bị xóa là kỷ lục đã duyệt.
- **Giao diện Admin**: 
  - Tại modal quản lý Người Dùng, thêm danh sách chi tiết các kỷ lục họ đã nộp, và nút "Xóa" cho từng kỷ lục.
  - Nút đỏ "XÓA TÀI KHOẢN" đã được thêm vào cuối form.

### 3. Tích Hợp Level Qua API GDBrowser & Thumbnail
- **Trang Admin (Tab mới: Thêm Màn Chơi)**: 
  - Giao diện cho phép nhập GD Level ID và Link YouTube Showcase.
  - Server sẽ gọi `fetch('https://gdbrowser.com/api/level/${gdLevelId}')` để tự động kéo Name, Creator, Difficulty, Description về.
  - Tự động tách `youtubeId` từ link video để làm thumbnail.
- **Trang Danh Sách Demon**:
  - Chuyển giao diện từ bảng Table đơn điệu sang dạng lưới (Grid) 3 cột hiển thị **Card**.
  - Background của mỗi Card chính là Thumbnail Video của màn chơi, được phủ màu đen mờ và có animation zoom khi di chuột.

### 4. Trang Chi Tiết Màn Chơi (`/demons/[id]`)
- Khi click vào bất kỳ Màn Chơi nào trong Demonlist, người dùng sẽ được đưa đến trang tổng hợp của màn đó.
- Nhúng (Embed) Video Showcase Youtube tự động phát ở background trên cùng (Hero Section).
- Liệt kê toàn bộ thông tin chi tiết.
- **Bảng Vinh Danh (Victors List)**: Xếp hạng những người chơi đã Pass màn đó, hiển thị theo thời gian/tiến độ, bao gồm Nút xem Video bằng chứng (nếu có).

## Verification
- Hệ thống Build Production hoàn thành không có lỗi Typecript.
- Code đảm bảo ổn định và tương thích đầy đủ với Prisma schema.
