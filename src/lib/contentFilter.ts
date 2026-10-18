/**
 * Bộ lọc nội dung phân biệt, cấm, nhạy cảm (Content Filter System) cho GDVN
 * Áp dụng cho:
 * 1. Username (khi đăng ký tài khoản)
 * 2. Bio (khi cập nhật thông tin cá nhân)
 *
 * Các nhóm từ được kiểm soát:
 * - Phân biệt vùng miền (bắc kỳ, nam kỳ, trung kỳ, bake, parky, ba que, bò đỏ, bò vàng, đu càng...)
 * - Phân biệt chủng tộc / sắc tộc (nigger, nigga, ching chong, mọi miên, mọi da đen...)
 * - Chủ nghĩa phát xít / cực đoan / khủng bố (hitler, nazi, swastika, việt tân...)
 * - Tục tĩu nặng / xúc phạm / chửi thề (địt mẹ, đụ má, cặc, lồn, buồi, dái, đĩ, óc chó, súc vật, chó đẻ...)
 * - Nhạy cảm / Khiêu dâm / Đồi trụy / 18+ / Ấu dâm / Xâm hại (ấu dâm, loạn luân, hiếp dâm, phim sex, hentai, porno...)
 * - Bạo lực / Tự tử / Tự hại (tự tử, tự sát, cắt cổ tay, suicide...)
 */

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
}

export function normalizeLeetspeak(str: string): string {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g');
}

export function collapseRepeated(str: string): string {
  return str.replace(/(.)\1+/g, '$1');
}

// Từ gốc nguy hiểm tuyệt đối không được phép xuất hiện trong username
const USERNAME_STRICT_SUBSTRINGS: readonly string[] = [
  // Phân biệt vùng miền & chính trị cực đoan
  'parky', 'parki', 'bucky', 'backy', 'baccay', 'namcay', 'trungsang',
  'baque', '3que', 'basoc', '3soc', 'ducang', 'khitruongson',
  // Sắc tộc & phát xít
  'nigger', 'nigga', 'n1gger', 'n1gga', 'nigba', 'chingchong', 'hitler', 'adolf', 'swastika',
  // Thô tục & xúc phạm nặng tiếng Việt
  'ditme', 'ditconme', 'dume', 'dumoe', 'duma',
  'concac', 'daucac', 'bucac', 'ancac', 'ngamcac', 'succcac',
  'conlon', 'lonque', 'nunglon', 'bulon', 'huplon',
  'daubuoi', 'bubuoi', 'anbuoi',
  'bucu', 'ngamcu', 'succu', 'soclo',
  'occho', 'chode', 'sucvat', 'sucsinh',
  'condi', 'didiem',
  // Nhạy cảm, ấu dâm, xâm hại, đồi trụy
  'audam', 'pedophile', 'loanluan', 'hiepdam', 'cuonghiep',
  'phimsex', 'phimheo', 'phimxxx', 'gaigoi',
  'hentai', 'motherfuck', 'fucker', 'fucking'
];

// Boundary patterns cho username (được bao bởi gạch dưới, gạch ngang, số hoặc đầu/cuối chuỗi)
const USERNAME_BOUNDARY_PATTERNS: readonly RegExp[] = [
  /(^|[0-9_-])bake([0-9_-]|$)/i,
  /(^|[0-9_-])nake([0-9_-]|$)/i,
  /(^|[0-9_-])(bodo|bovang)([0-9_-]|$)/i,
  /(^|[0-9_-])(fuck|fck)([0-9_-]|$)/i,
  /(^|[0-9_-])bitch(es)?([0-9_-]|$)/i,
  /(^|[0-9_-])(cunt|pussy)([0-9_-]|$)/i,
  /(^|[0-9_-])(asshole|dipshit|jackass|bastard|faggot|retard)([0-9_-]|$)/i,
  /(^|[0-9_-])porno?([0-9_-]|$)/i,
  /(^|[0-9_-])sex([0-9_-]|$)/i,
  /(^|[0-9_-])(dkm|dcm|dcmm|clgt|vcl|vkl|clmm|ccmm|dbcl)([0-9_-]|$)/i,
  /(^|[0-9_-])(cac|lon|buoi|dai)([0-9_-]|$)/i,
  /(^|[0-9_-])cu_?(to|nho|bu|den|lon)([0-9_-]|$)/i,
  /(^|[0-9_-])suicide([0-9_-]|$)/i,
];

export interface ContentFilterResult {
  ok: boolean;
  errorEn?: string;
  errorVi?: string;
  reason?: string;
}

/**
 * Kiểm tra username có chứa từ ngữ phân biệt, từ cấm hoặc nhạy cảm hay không.
 */
export function validateUsernameContent(username: string): ContentFilterResult {
  if (!username) return { ok: true };
  const raw = String(username).toLowerCase().trim();
  const deLeet = normalizeLeetspeak(raw);
  const strippedRaw = collapseRepeated(raw.replace(/[_-]/g, ''));
  const strippedDeLeet = collapseRepeated(deLeet.replace(/[_-]/g, ''));

  // 1. Quét chuỗi con nghiêm ngặt
  for (const root of USERNAME_STRICT_SUBSTRINGS) {
    if (
      raw.includes(root) ||
      deLeet.includes(root) ||
      strippedRaw.includes(root) ||
      strippedDeLeet.includes(root)
    ) {
      return {
        ok: false,
        errorEn: 'Username contains sensitive, offensive, or prohibited words.',
        errorVi: 'Tên người dùng chứa từ ngữ nhạy cảm, không phù hợp hoặc bị cấm.',
        reason: `Matched strict username root: ${root}`,
      };
    }
  }

  // 2. Quét mẫu biên từ (ranh giới phân cách hoặc đầu/cuối)
  for (const pattern of USERNAME_BOUNDARY_PATTERNS) {
    if (
      pattern.test(raw) ||
      pattern.test(deLeet) ||
      pattern.test(strippedRaw) ||
      pattern.test(strippedDeLeet)
    ) {
      return {
        ok: false,
        errorEn: 'Username contains sensitive, offensive, or prohibited words.',
        errorVi: 'Tên người dùng chứa từ ngữ nhạy cảm, không phù hợp hoặc bị cấm.',
        reason: `Matched boundary username pattern: ${pattern}`,
      };
    }
  }

  return { ok: true };
}

// Mẫu tiếng Việt có dấu trong Bio
const BIO_ACCENTED_PATTERNS: readonly RegExp[] = [
  // Phân biệt vùng miền & kỳ thị
  /\b(bắc\s*kỳ|bắc\s*kì|nam\s*kỳ|nam\s*kì|trung\s*kỳ|trung\s*kì)\b/i,
  /\b(bắc\s*cầy|nam\s*cầy|khỉ\s*trường\s*sơn|khỉ\s*rừng)\b/i,
  /\b(ba\s*que|3\s*que|ba\s*sọc|3\s*sọc|đu\s*càng|bò\s*đỏ|bò\s*vàng)\b/i,
  /\b(việt\s*tân|ngụy\s*quân|ngụy\s*quyền)\b/i,
  /\b(mọi\s*miên|mọi\s*rợ|mọi\s*đen|mọi\s*da\s*đen|khỉ\s*đen)\b/i,
  // Thô tục, chửi thề, xúc phạm
  /\b(đụ\s*(má|mẹ|mợ|mọe|me|cha|bà|cụ|con\s*mẹ|đĩ))\b/i,
  /\b(địt\s*(mẹ|con\s*mẹ|cụ|bà|bố|nhà|mẹ\s*mày))\b/i,
  /\b(lồn|cặc|buồi|dái)\b/i,
  // Biến thể cố tình chèn ký tự lách luật
  /l[\s._*~-]*ồ[\s._*~-]*n/i,
  /c[\s._*~-]*ặ[\s._*~-]*c/i,
  /b[\s._*~-]*u[\s._*~-]*ồ[\s._*~-]*i/i,
  /đ[\s._*~-]*ụ\b/i,
  /đ[\s._*~-]*ị[\s._*~-]*t\b/i,
  /d[\s._*~-]*á[\s._*~-]*i/i,
  /\b(con\s*đĩ|đĩ\s*mẹ|đĩ\s*thõa|đĩ\s*điếm|đồ\s*đĩ)\b/i,
  /\b(óc\s*chó|chó\s*đẻ|chó\s*má|súc\s*vật|súc\s*sinh)\b/i,
  /\b(thủ\s*dâm|sóc\s*lọ|sục\s*cặc|sục\s*cu|bú\s*cu|ngậm\s*cu|bú\s*cặc|húp\s*lồn|bú\s*lồn|nứng\s*lồn)\b/i,
  // Nhạy cảm, ấu dâm, tình dục, bạo lực
  /\b(ấu\s*dâm|hiếp\s*dâm|cưỡng\s*hiếp|loạn\s*luân)\b/i,
  /\b(phim\s*sex|phim\s*heo|phim\s*xxx|ảnh\s*nóng|gái\s*gọi|bán\s*dâm|mua\s*dâm)\b/i,
  /\b(tự\s*tử|tự\s*sát|cắt\s*cổ\s*tay|uống\s*thuốc\s*độc|treo\s*cổ\s*tự\s*tử|nhảy\s*lầu\s*tự\s*tử)\b/i,
];

// Mẫu tiếng Việt không dấu & tiếng Anh trong Bio
const BIO_UNACCENTED_PATTERNS: readonly RegExp[] = [
  /\b(bac\s*ky|bac\s*ki|nam\s*ky|nam\s*ki|trung\s*ky|trung\s*ki)\b/i,
  /\b(b[\s._*~-]*a[\s._*~-]*k[\s._*~-]*e)\b/i,
  /\b(p[\s._*~-]*a[\s._*~-]*r[\s._*~-]*k[\s._*~-]*y)\b/i,
  /\b(p[\s._*~-]*4[\s._*~-]*r[\s._*~-]*k[\s._*~-]*y)\b/i,
  /\b(bucky|backy|nake|namcay|baccay|trungsang)\b/i,
  /\b(ba\s*que|3\s*que|ba\s*soc|3\s*soc|du\s*cang|bo\s*do|bo\s*vang)\b/i,
  /\b(nigger|nigga|ching\s*chong|chink|gook|kike|swastika|hitler|adolf|nazi|neonazi)\b/i,
  /\b(moi\s*mien|moi\s*ro|moi\s*den)\b/i,
  /\b(du\s*ma|du\s*me|du\s*moe|duma|dume|dumoe)\b/i,
  /\b(dit\s*me|dit\s*con\s*me|dit\s*cu|dit\s*ba|ditme|ditconme)\b/i,
  /\b(con\s*cac|thang\s*cac|dau\s*cac|bu\s*cac|an\s*cac|ngam\s*cac|suc\s*cac|daucac|bucac)\b/i,
  /\b(lon\s*que|nung\s*lon|bu\s*lon|hup\s*lon|lon\s*me|lonque)\b/i,
  /\b(dau\s*buoi|bu\s*buoi|an\s*buoi|daubuoi|bubuoi)\b/i,
  /\b(bu\s*cu|ngam\s*cu|suc\s*cu|soc\s*lo|bucu|ngamcu|soclo)\b/i,
  /\b(oc\s*cho|cho\s*de|cho\s*ma|suc\s*vat|suc\s*sinh|occho|chode|sucvat|sucsinh)\b/i,
  /\b(con\s*di|di\s*me|di\s*diem|condi|didiem)\b/i,
  /\b(dkm|dcm|dcmm|clgt|vcl|vkl|clmm|ccmm|dbcl)\b/i,
  /\b(fuck|fucker|fucking|motherfucker|bitch|bitches|cunt|pussy|asshole|dipshit|bastard|faggot|retard)\b/i,
  /\b(blowjob|handjob|cumshot|deepthroat)\b/i,
  /\b(au\s*dam|audam|pedophile|pedo|hiep\s*dam|hiepdam|cuong\s*hiep|cuonghiep|loan\s*luan|loanluan|incest|rapist)\b/i,
  /\b(phim\s*sex|phimsex|phim\s*heo|phimheo|phim\s*xxx|phimxxx|gai\s*goi|gaigoi|ban\s*dam|bandam)\b/i,
  /\b(hentai|porno|pornography)\b/i,
  /\b(tu\s*tu|tu\s*sat|suicide|kill\s*myself|cat\s*co\s*tay)\b/i,
];

// Danh sách từ cấm tuyệt đối khi nén chuỗi Bio (loại bỏ khoảng trắng, dấu câu)
const BIO_COMPRESSED_STRICT: readonly string[] = [
  'parky', 'parki', 'bucky', 'backy', 'baccay', 'namcay', 'trungsang',
  'baque', '3que', 'basoc', '3soc', 'ducang', 'khitruongson',
  'nigger', 'nigga', 'n1gger', 'n1gga', 'nigba', 'chingchong', 'hitler', 'adolf', 'swastika',
  'ditme', 'ditconme', 'dume', 'dumoe', 'duma',
  'concac', 'daucac', 'bucac', 'ancac', 'ngamcac', 'succcac',
  'lonque', 'nunglon', 'bulon', 'huplon',
  'daubuoi', 'bubuoi', 'anbuoi',
  'bucu', 'ngamcu', 'succu', 'soclo',
  'occho', 'chode', 'sucvat', 'sucsinh',
  'condi', 'didiem',
  'audam', 'pedophile', 'loanluan', 'hiepdam', 'cuonghiep',
  'phimsex', 'phimheo', 'phimxxx', 'gaigoi',
  'hentai', 'motherfuck', 'fucker', 'fucking'
];

/**
 * Kiểm tra nội dung tiểu sử (Bio) có chứa từ ngữ phân biệt, từ cấm hoặc nhạy cảm hay không.
 */
export function validateBioContent(bio: string | null | undefined): ContentFilterResult {
  if (!bio) return { ok: true };
  const text = String(bio).trim();
  if (!text) return { ok: true };

  // 1. Kiểm tra mẫu tiếng Việt có dấu
  for (const pattern of BIO_ACCENTED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        errorEn: 'Bio contains sensitive, offensive, or prohibited content.',
        errorVi: 'Tiểu sử chứa từ ngữ nhạy cảm, xúc phạm hoặc không phù hợp với tiêu chuẩn cộng đồng.',
        reason: `Matched bio accented pattern: ${pattern}`,
      };
    }
  }

  // 2. Kiểm tra mẫu không dấu & tiếng Anh
  const unaccented = removeVietnameseAccents(text).toLowerCase();
  for (const pattern of BIO_UNACCENTED_PATTERNS) {
    if (pattern.test(unaccented)) {
      return {
        ok: false,
        errorEn: 'Bio contains sensitive, offensive, or prohibited content.',
        errorVi: 'Tiểu sử chứa từ ngữ nhạy cảm, xúc phạm hoặc không phù hợp với tiêu chuẩn cộng đồng.',
        reason: `Matched bio unaccented pattern: ${pattern}`,
      };
    }
  }

  // 3. Kiểm tra nén chống lách luật (xóa khoảng trắng, dấu chấm, dấu sao xen kẽ)
  const compressed = collapseRepeated(unaccented.replace(/[^a-z0-9]/g, ''));
  const deLeetCompressed = collapseRepeated(normalizeLeetspeak(unaccented).replace(/[^a-z0-9]/g, ''));
  for (const root of BIO_COMPRESSED_STRICT) {
    if (compressed.includes(root) || deLeetCompressed.includes(root)) {
      return {
        ok: false,
        errorEn: 'Bio contains sensitive, offensive, or prohibited content.',
        errorVi: 'Tiểu sử chứa từ ngữ nhạy cảm, xúc phạm hoặc không phù hợp với tiêu chuẩn cộng đồng.',
        reason: `Matched bio compressed pattern: ${root}`,
      };
    }
  }

  return { ok: true };
}
