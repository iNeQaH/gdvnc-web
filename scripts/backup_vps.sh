#!/bin/bash
set -e

BACKUP_DIR="/var/backups/gdvn"
APP_DIR="/var/www/gdvnc-web-main"
DATE=$(date +"%Y%m%d_%H%M%S")
TAG="gdvn_backup_${DATE}"
TMP="/tmp/${TAG}"
ARCHIVE="${BACKUP_DIR}/${TAG}.tar.gz"

mkdir -p "$BACKUP_DIR"
mkdir -p "$TMP"

echo "[$(date)] Bắt đầu sao lưu hệ thống GDVN..."

# 1. Dump database PostgreSQL
echo "[$(date)] 1. Đang xuất Database PostgreSQL 'gdvn'..."
su - postgres -c 'pg_dump gdvn | gzip' > "$TMP/database.sql.gz"

# 2. Nén thư mục ảnh user-data
echo "[$(date)] 2. Đang đóng gói thư mục ảnh user-data..."
tar -czf "$TMP/userdata.tar.gz" -C "$APP_DIR" user-data 2>/dev/null || true

# 3. Thống kê
su - postgres -c "psql -d gdvn -t -A -c \"SELECT json_build_object('users', (SELECT count(*) FROM \\\"User\\\"), 'levels', (SELECT count(*) FROM \\\"Level\\\"), 'records', (SELECT count(*) FROM \\\"Record\\\"));\"" > "$TMP/stats.json" 2>/dev/null || true

# 4. Đóng gói file tổng
tar -czf "$ARCHIVE" -C /tmp "$TAG"
rm -rf "$TMP"

echo "[$(date)] Bản sao lưu đã lưu tại: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# 5. Tự động xoá các bản sao lưu cũ hơn 7 ngày trên VPS (tránh đầy ổ cứng)
find "$BACKUP_DIR" -name "gdvn_backup_*.tar.gz" -type f -mtime +7 -delete

# 6. Nếu rclone đã được cấu hình với remote gdrive, tự động đẩy lên Google Drive
if command -v rclone &> /dev/null && rclone listremotes | grep -q "^gdrive:"; then
    echo "[$(date)] 6. Đang đồng bộ bản sao lưu lên Google Drive (gdrive:GDVN_Backups)..."
    rclone copy "$ARCHIVE" "gdrive:GDVN_Backups" --transfers=2 --log-level INFO
    echo "[$(date)] Đã đồng bộ lên Google Drive thành công!"
else
    echo "[$(date)] Chưa cấu hình Google Drive rclone (bỏ qua bước tải lên cloud)."
fi

echo "[$(date)] Hoàn tất quá trình sao lưu GDVN!"
