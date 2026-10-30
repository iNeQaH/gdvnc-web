export interface WebChangelog {
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: string[];
}

export const WEB_CHANGELOGS: WebChangelog[] = [
  {
    version: '2.5.0',
    date: '30/10/2026',
    title: 'Cổng thông tin Trang chủ & Bảng xếp hạng Daily',
    changes: [
      'Tách riêng Cổng thông tin trang chủ (/): Bài đăng tiêu điểm, Thẻ vinh danh Top 1, Shoutout và Best Support.',
      'Bảng xếp hạng Daily: Xếp hạng người chơi theo điểm hoạt động cày trong ngày (+1 star/moon, +10 demon).',
      'Tối ưu độ tương phản Light Mode và hiệu ứng thở glow dịu êm bất đồng bộ.',
      'Khắc phục cơ chế xóa thông báo và bộ nhớ đệm trang chủ cập nhật tức thời.'
    ]
  },
  {
    version: '2.4.0',
    date: '29/10/2026',
    title: 'Tích hợp Boomlings API & Chuẩn hóa Challenge',
    changes: [
      'Thay thế GDBrowser bằng Boomlings API giao thức GD 2.2 trực tiếp, giảm 50% độ trễ.',
      'Thuật toán dời & chuẩn hóa thứ hạng Challenge List, chống trùng lặp rank.',
      'Sửa lỗi tính điểm hoạt động Clan khi thành viên mới tham gia.'
    ]
  },
  {
    version: '2.3.0',
    date: '26/10/2026',
    title: 'Mở rộng Classic List 1000 Level & Phân cấp Clan',
    changes: [
      'Nâng cấp Classic Demonlist lên 1000 màn chơi theo hàm số suy giảm điểm chuẩn.',
      'Phân cấp Clan Tier (Tier 1 đến Tier 4) và bảng xếp hạng Clan theo điểm hoạt động.',
      'Chuẩn hóa bảng màu Rating Geometry Dash (Mythic, Legendary, Epic, Feature, Rate).'
    ]
  }
];
