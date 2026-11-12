// Danh sách chuẩn 34 tỉnh / thành phố sau sáp nhập + 2 Quần đảo (Nghị quyết Trung ương / Quốc hội)
export const VN_PROVINCES = [
  // 6 Thành phố trực thuộc Trung ương
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Huế',

  // 28 Tỉnh
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',

  // 2 Quần đảo đặc quyền chủ quyền
  'Quần đảo Hoàng Sa',
  'Quần đảo Trường Sa',
] as const;

// Bản đồ tương thích ngược từ 63 tỉnh/thành cũ sang 34 tỉnh/thành mới
export const LEGACY_PROVINCE_MERGE_MAP: Record<string, string> = {
  'Hà Giang': 'Tuyên Quang',
  'Yên Bái': 'Lào Cai',
  'Bắc Kạn': 'Thái Nguyên',
  'Vĩnh Phúc': 'Phú Thọ',
  'Hòa Bình': 'Phú Thọ',
  'Bắc Giang': 'Bắc Ninh',
  'Thái Bình': 'Hưng Yên',
  'Hải Dương': 'Hải Phòng',
  'Hà Nam': 'Ninh Bình',
  'Nam Định': 'Ninh Bình',
  'Quảng Bình': 'Quảng Trị',
  'Quảng Nam': 'Đà Nẵng',
  'Kon Tum': 'Quảng Ngãi',
  'Bình Định': 'Gia Lai',
  'Ninh Thuận': 'Khánh Hòa',
  'Đắk Nông': 'Lâm Đồng',
  'Bình Thuận': 'Lâm Đồng',
  'Phú Yên': 'Đắk Lắk',
  'Bình Dương': 'TP. Hồ Chí Minh',
  'Bà Rịa - Vũng Tàu': 'TP. Hồ Chí Minh',
  'Bình Phước': 'Đồng Nai',
  'Long An': 'Tây Ninh',
  'Sóc Trăng': 'Cần Thơ',
  'Hậu Giang': 'Cần Thơ',
  'Bến Tre': 'Vĩnh Long',
  'Trà Vinh': 'Vĩnh Long',
  'Tiền Giang': 'Đồng Tháp',
  'Bạc Liêu': 'Cà Mau',
  'Kiên Giang': 'An Giang',
  'Thừa Thiên Huế': 'Huế',
};

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
  ...VN_PROVINCES.filter((p) => p !== 'Quần đảo Hoàng Sa' && p !== 'Quần đảo Trường Sa').map((p) => `${p}, Việt Nam`),
  'Khánh Hòa (Quần đảo Trường Sa), Việt Nam',
  'Đà Nẵng (Quần đảo Hoàng Sa), Việt Nam',
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

  // 2. Kiểm tra các lựa chọn đặc biệt cho 2 Quần đảo
  if (stripped.includes('truong sa')) {
    return {
      ok: true,
      normalized: 'Khánh Hòa (Quần đảo Trường Sa), Việt Nam',
    };
  }
  if (stripped.includes('hoang sa')) {
    return {
      ok: true,
      normalized: 'Đà Nẵng (Quần đảo Hoàng Sa), Việt Nam',
    };
  }

  // 3. Tìm kiếm khớp với danh sách 34 tỉnh thành Việt Nam (kèm hỗ trợ tên cũ sáp nhập)
  let cleanProvince = raw
    .replace(/,\s*việt nam/i, '')
    .replace(/,\s*vietnam/i, '')
    .replace(/,\s*vn/i, '')
    .replace(/^(tỉnh|thành phố|tp\.?)\s+/i, '')
    .trim();

  const strippedClean = stripVietnameseDiacritics(cleanProvince);

  // So khớp với VN_PROVINCES (34 tỉnh/thành mới)
  for (const province of VN_PROVINCES) {
    if (province === 'Quần đảo Hoàng Sa' || province === 'Quần đảo Trường Sa') continue;
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

  // So khớp với danh sách tỉnh cũ trước sáp nhập -> tự động chuẩn hóa sang tỉnh mới
  for (const [oldProv, newProv] of Object.entries(LEGACY_PROVINCE_MERGE_MAP)) {
    const oldClean = oldProv.replace(/^(tp\.?)\s+/i, '');
    const oldStripped = stripVietnameseDiacritics(oldClean);
    const oldFullStripped = stripVietnameseDiacritics(oldProv);

    if (
      strippedClean === oldStripped ||
      strippedClean === oldFullStripped ||
      stripped === oldFullStripped ||
      stripped === stripVietnameseDiacritics(`${oldProv}, việt nam`) ||
      stripped === stripVietnameseDiacritics(`${oldProv}, vietnam`)
    ) {
      return {
        ok: true,
        normalized: `${newProv}, Việt Nam`,
      };
    }
  }

  // 4. So khớp với danh sách quốc gia quốc tế
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

  // 1. Quần đảo Trường Sa & Hoàng Sa (phải kiểm tra trước Khánh Hòa và Đà Nẵng)
  if (stripped.includes('truong sa')) {
    return 'Quần đảo Trường Sa';
  }
  if (stripped.includes('hoang sa')) {
    return 'Quần đảo Hoàng Sa';
  }

  // 2. Xử lý các alias đặc biệt
  if (stripped.includes('hcm') || stripped.includes('ho chi minh') || stripped.includes('sai gon')) {
    return 'TP. Hồ Chí Minh';
  }
  if (stripped.includes('ha noi') || stripped.includes('hanoi') || stripped.includes('thang long')) {
    return 'Hà Nội';
  }
  if (stripped.includes('hai phong') || stripped.includes('haiphong')) {
    return 'Hải Phòng';
  }
  if (stripped.includes('can tho') || stripped.includes('cantho')) {
    return 'Cần Thơ';
  }
  if (stripped.includes('da nang') || stripped.includes('danang')) {
    return 'Đà Nẵng';
  }
  if (stripped.includes('thua thien hue') || stripped.includes('hue')) {
    return 'Huế';
  }

  // 3. Quét qua VN_PROVINCES (34 tỉnh thành)
  for (const province of VN_PROVINCES) {
    if (province === 'Quần đảo Hoàng Sa' || province === 'Quần đảo Trường Sa') continue;
    const pClean = province.replace(/^(tp\.?)\s+/i, '');
    const pStripped = stripVietnameseDiacritics(pClean);
    const pFullStripped = stripVietnameseDiacritics(province);

    // Kiểm tra từ khoá province xuất hiện trong chuỗi
    const regex = new RegExp(`(^|[^a-z0-9])${pStripped}([^a-z0-9]|$)`, 'i');
    if (regex.test(stripped) || stripped.includes(pFullStripped)) {
      return province;
    }
  }

  // 4. Quét qua các tỉnh cũ trước sáp nhập -> trả về tỉnh mới tương ứng
  for (const [oldProv, newProv] of Object.entries(LEGACY_PROVINCE_MERGE_MAP)) {
    const oldClean = oldProv.replace(/^(tp\.?)\s+/i, '');
    const oldStripped = stripVietnameseDiacritics(oldClean);
    const oldFullStripped = stripVietnameseDiacritics(oldProv);

    const regex = new RegExp(`(^|[^a-z0-9])${oldStripped}([^a-z0-9]|$)`, 'i');
    if (regex.test(stripped) || stripped.includes(oldFullStripped)) {
      return newProv;
    }
  }

  return null;
}

