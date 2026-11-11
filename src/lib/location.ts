// Danh sách chuẩn 63 tỉnh / thành phố trực thuộc Trung ương của Việt Nam
export const VN_PROVINCES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái',
] as const;

// Danh sách một số quốc gia phổ biến quốc tế
export const MAJOR_COUNTRIES = [
  'Việt Nam',
  'Hoa Kỳ (United States)',
  'Nhật Bản (Japan)',
  'Hàn Quốc (South Korea)',
  'Úc (Australia)',
  'Canada',
  'Vương quốc Anh (United Kingdom)',
  'Pháp (France)',
  'Đức (Germany)',
  'Singapore',
  'Thái Lan (Thailand)',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'Đài Loan (Taiwan)',
  'Nga (Russia)',
  'Brazil',
  'Ấn Độ (India)',
  'Trung Quốc (China)',
] as const;

// Danh sách gợi ý sẵn cho ô chọn (Tỉnh/Thành phố, Việt Nam)
export const LOCATION_OPTIONS: string[] = [
  ...VN_PROVINCES.map((p) => `${p}, Việt Nam`),
  ...MAJOR_COUNTRIES.filter((c) => c !== 'Việt Nam'),
];

// Hàm chuẩn hóa chuỗi để so sánh không dấu, bỏ ký tự thừa
export function stripVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Từ khóa cấm: địa chỉ nhà cụ thể (số nhà, đường, ngõ, phường, xã...)
const DISALLOWED_ADDRESS_KEYWORDS = [
  'so nha',
  'số nhà',
  'duong',
  'đường',
  'pho',
  'phố',
  'ngo',
  'ngõ',
  'ngach',
  'ngách',
  'hem',
  'hẻm',
  'ap',
  'ấp',
  'thon',
  'thôn',
  'xom',
  'xóm',
  'phuong',
  'phường',
  'quan',
  'quận',
  'huyen',
  'huyện',
  'thi xa',
  'thị xã',
  'to dan pho',
  'tổ dân phố',
  'khu pho',
  'khu phố',
  'chung cu',
  'chung cư',
  'toa nha',
  'tòa nhà',
  'can ho',
  'căn hộ',
];

/**
 * Kiểm tra và chuẩn hoá vị trí (tỉnh/thành phố, nước):
 * - Không bắt buộc (rỗng => hợp lệ, lưu null)
 * - Không cho phép địa chỉ nhà cụ thể
 * - Phải khớp hoặc tương đương với tỉnh/thành phố hoặc quốc gia hợp lệ
 */
export function validateLocation(input?: string | null): {
  ok: boolean;
  normalized: string | null;
  error?: string;
} {
  if (!input || !input.trim()) {
    return { ok: true, normalized: null };
  }

  const raw = input.trim();
  const rawLower = raw.toLowerCase();
  const stripped = stripVietnameseDiacritics(raw);

  // 1. Kiểm tra xem có chứa từ khóa địa chỉ nhà cụ thể không
  for (const kw of DISALLOWED_ADDRESS_KEYWORDS) {
    const strippedKw = stripVietnameseDiacritics(kw);
    // Bắt keyword độc lập hoặc có dấu cách
    const regex = new RegExp(`\\b${strippedKw}\\b`, 'i');
    if (regex.test(stripped)) {
      return {
        ok: false,
        normalized: null,
        error: 'Vui lòng chỉ chọn hoặc nhập Tỉnh/Thành phố hoặc Quốc gia, không ghi địa chỉ nhà cụ thể (số nhà, đường, phường, xã...).',
      };
    }
  }

  // Kiểm tra số nhà dạng x/y (VD: 12/4)
  if (/\b\d+\s*\/\s*\d+[a-zA-Z]?\b/.test(raw)) {
    return {
      ok: false,
      normalized: null,
      error: 'Không được nhập số nhà cụ thể. Chỉ cần nhập Tỉnh/Thành phố.',
    };
  }

  // 2. Tìm kiếm khớp với danh sách 63 tỉnh thành Việt Nam
  // Tách xem người dùng có gõ "Tỉnh...", "TP.", "Thành phố...", hoặc kèm ", Việt Nam" hay không
  let cleanProvince = raw
    .replace(/,\s*việt nam/i, '')
    .replace(/,\s*vietnam/i, '')
    .replace(/,\s*vn/i, '')
    .replace(/^(tỉnh|thành phố|tp\.?)\s+/i, '')
    .trim();

  const strippedClean = stripVietnameseDiacritics(cleanProvince);

  // So khớp với VN_PROVINCES
  for (const province of VN_PROVINCES) {
    const pClean = province.replace(/^(tp\.?)\s+/i, '');
    const pStripped = stripVietnameseDiacritics(pClean);
    const pFullStripped = stripVietnameseDiacritics(province);

    if (
      strippedClean === pStripped ||
      strippedClean === pFullStripped ||
      stripped === pFullStripped ||
      stripped === stripVietnameseDiacritics(`${province}, việt nam`) ||
      stripped === stripVietnameseDiacritics(`${province}, vietnam`)
    ) {
      return {
        ok: true,
        normalized: `${province}, Việt Nam`,
      };
    }
  }

  // 3. So khớp với danh sách quốc gia quốc tế
  for (const country of MAJOR_COUNTRIES) {
    const cStripped = stripVietnameseDiacritics(country);
    // Bỏ phần trong ngoặc đơn nếu có
    const simpleCountry = country.replace(/\s*\(.*?\)/, '');
    const simpleStripped = stripVietnameseDiacritics(simpleCountry);
    const inParenMatch = country.match(/\((.*?)\)/);
    const parenStripped = inParenMatch ? stripVietnameseDiacritics(inParenMatch[1]) : '';

    if (
      stripped === cStripped ||
      stripped === simpleStripped ||
      (parenStripped && stripped === parenStripped)
    ) {
      return {
        ok: true,
        normalized: country,
      };
    }
  }

  // 4. Nếu người dùng nhập dạng "City, Country" quốc tế hợp lý (chỉ chữ cái, dấu phẩy, khoảng trắng, gạch ngang)
  // và độ dài từ 3 đến 60 ký tự, không có số nhà, ký tự lạ
  const internationalPattern = /^[\p{L}\s\-\.']+(?:,\s*[\p{L}\s\-\.']+)*$/u;
  if (internationalPattern.test(raw) && raw.length >= 3 && raw.length <= 60) {
    // Viết hoa chữ cái đầu mỗi từ
    const formatted = raw
      .split(',')
      .map((part) =>
        part
          .trim()
          .split(/\s+/)
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
          .join(' ')
      )
      .join(', ');
    return {
      ok: true,
      normalized: formatted,
    };
  }

  return {
    ok: false,
    normalized: null,
    error: 'Vui lòng chọn hoặc tự điền đúng tên Tỉnh/Thành phố hoặc Quốc gia hợp lệ.',
  };
}

/**
 * Trích xuất tên Tỉnh/Thành phố chuẩn của Việt Nam từ chuỗi vị trí của người dùng trong DB
 */
export function extractProvinceFromLocation(location?: string | null): string | null {
  if (!location || !location.trim()) return null;
  const raw = location.trim();
  const stripped = stripVietnameseDiacritics(raw);

  // Xử lý các alias đặc biệt
  if (stripped.includes('hcm') || stripped.includes('ho chi minh') || stripped.includes('sai gon')) {
    return 'TP. Hồ Chí Minh';
  }
  if (stripped.includes('ha noi') || stripped.includes('hanoi') || stripped.includes('thang long')) {
    return 'Hà Nội';
  }

  // Quét qua 63 tỉnh
  for (const province of VN_PROVINCES) {
    const pClean = province.replace(/^(tp\.?)\s+/i, '');
    const pStripped = stripVietnameseDiacritics(pClean);
    const pFullStripped = stripVietnameseDiacritics(province);

    // Kiểm tra từ khoá province xuất hiện trong chuỗi
    const regex = new RegExp(`(^|[^a-z0-9])${pStripped}([^a-z0-9]|$)`, 'i');
    if (regex.test(stripped) || stripped.includes(pFullStripped)) {
      return province;
    }
  }

  return null;
}

