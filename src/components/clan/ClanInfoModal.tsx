'use client';

import React from 'react';
import { X, Shield, Coins, Users, Palette, Sparkles, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface ClanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClanInfoModal({ isOpen, onClose }: ClanInfoModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl space-y-6 p-6 sm:p-7 animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black ui-title">
                {isEn ? 'Clan System & Tier Guide' : 'Giới thiệu Hệ thống Clan & Cấp bậc Tier'}
              </h2>
              <p className="text-xs ui-dim mt-0.5">
                {isEn
                  ? 'Overview of Clan mechanics, SP Points maintenance, and tier benefits.'
                  : 'Tổng quan chức năng, cơ chế duy trì điểm SP và quyền lợi theo từng cấp bậc.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border ui-dim hover:text-white transition-colors cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Overview */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>{isEn ? '1. What is a Clan?' : '1. Chức năng Clan là gì?'}</span>
          </h3>
          <div className="p-4 rounded-2xl border text-xs leading-relaxed ui-title bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
            {isEn
              ? 'Clan is an organization where players gather as a team, compete together, conquer level lists (Classic & Platformer), accumulate points, and showcase their standing on the GDVN Clan Leaderboard.'
              : 'Clan là tổ chức dành cho cộng đồng người chơi GDVN, nơi các thành viên gắn kết thành một đội ngũ, cùng nhau chinh phục danh sách màn chơi (Classic & Platformer), tích lũy điểm số và khẳng định vị thế trên Bảng Xếp Hạng Clan.'}
          </div>
        </div>

        {/* Section 2: Mechanics & SP Points */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEn ? '2. Mechanics & SP Points' : '2. Cơ chế hoạt động & Điểm SP'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border space-y-1.5 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                {isEn ? 'Create Clan' : 'Khởi tạo Clan'}
              </span>
              <p className="text-xs ui-dim leading-relaxed">
                {isEn
                  ? 'Requires at least 3 SP Coins (equivalent to 3 active Supporter months) to found a new clan.'
                  : 'Yêu cầu tối thiểu 3 SP Coin (tương đương 3 tháng thời hạn Supporter đang hoạt động) để thành lập Clan mới.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border space-y-1.5 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider block">
                {isEn ? 'Maintain SP' : 'Duy trì SP'}
              </span>
              <p className="text-xs ui-dim leading-relaxed">
                {isEn
                  ? 'Total clan SP is the sum of SP Coins voluntarily pledged by members. SP naturally decreases as supporter time expires.'
                  : 'Điểm SP của Clan là tổng số SP Coin do các thành viên tự nguyện đóng góp. Điểm SP giảm dần theo thời gian sử dụng Supporter.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border space-y-1.5 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                {isEn ? 'Withdraw SP' : 'Rút & Hoàn trả SP'}
              </span>
              <p className="text-xs ui-dim leading-relaxed">
                {isEn
                  ? 'Members can withdraw pledged SP at any time, and SP is 100% refunded upon leaving. If SP drops below 3, grace period activates.'
                  : 'Thành viên có thể rút lại SP Coin bất kỳ lúc nào hoặc khi rời Clan. Nếu Clan giảm dưới 3 SP, thời gian ân hạn sẽ kích hoạt.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Tier System & Benefits */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>{isEn ? '3. Tier Ranks & Benefits' : '3. Cấp bậc Tier & Quyền lợi'}</span>
          </h3>

          <div className="space-y-3">
            {/* Tier 1 */}
            <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Tier 1 (3 - 9 SP)
                </span>
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Max 5 members' : 'Tối đa 5 thành viên'}</span>
                </span>
              </div>
              <ul className="text-xs ui-dim space-y-1 pl-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Solid Color Clan Tag customization.' : 'Tùy chỉnh màu Tag Clan dạng đơn sắc (Solid Color).'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Clan profile page, victor showcase, member roster.' : 'Trang hồ sơ Clan riêng, bảng vinh danh Top thành tích và danh sách thành viên.'}</span>
                </li>
              </ul>
            </div>

            {/* Tier 2 */}
            <div className="p-4 rounded-2xl border bg-sky-500/5 border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Tier 2 (10 - 19 SP)
                </span>
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Max 15 members' : 'Tối đa 15 thành viên'}</span>
                </span>
              </div>
              <ul className="text-xs ui-dim space-y-1 pl-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{isEn ? 'Unlock 2-color Gradient Clan Tag with custom rotation angle.' : 'Mở khóa dải màu Gradient 2 màu và góc xoay tùy chỉnh cho Tag Clan.'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{isEn ? 'Customizable Clan Page Theme Color & Theme Gradient.' : 'Tùy biến màu chủ đạo và Theme Gradient riêng cho trang Clan.'}</span>
                </li>
              </ul>
            </div>

            {/* Tier 3 */}
            <div className="p-4 rounded-2xl border bg-purple-500/5 border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Tier 3 (20 - 49 SP)
                </span>
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Max 50 members' : 'Tối đa 50 thành viên'}</span>
                </span>
              </div>
              <ul className="text-xs ui-dim space-y-1 pl-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{isEn ? 'Rotating Conic Glow border effect with adjustable opacity (10% - 100%).' : 'Mở khóa hiệu ứng hào quang phát sáng xoay (Glow Conic) cho viền thẻ Clan kèm thanh trượt độ mờ (10% - 100%).'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{isEn ? 'Exclusive VIP Tier 3 badge on Clan list and member profiles.' : 'Huy hiệu VIP Tier 3 đặc quyền trên danh sách Clan và trang cá nhân thành viên.'}</span>
                </li>
              </ul>
            </div>

            {/* Tier 4 */}
            <div className="p-4 rounded-2xl border bg-rose-500/5 border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Tier 4 (Từ 50 SP trở lên)
                </span>
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Max 100 members' : 'Tối đa 100 thành viên'}</span>
                </span>
              </div>
              <ul className="text-xs ui-dim space-y-1 pl-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{isEn ? 'Maximum 100 members capacity.' : 'Mở rộng quy mô Clan lên tới tối đa 100 thành viên.'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{isEn ? 'Special Animated Shimmer & Mythic Glow frame on Clan Card.' : 'Khung thẻ Clan phát sáng đặc biệt (Animated Mythic Glow + Gradient lấp lánh).'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{isEn ? 'Exclusive Mythic Tier 4 Badge.' : 'Huy hiệu Tối thượng Mythic Clan Tier 4.'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 4: Tier Demotion & Member Limit Warnings */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{isEn ? '4. Tier Demotion & Member Limit Warnings' : '4. Cảnh báo Tụt Tier & Giới hạn Thành viên'}</span>
          </h3>

          <div className="p-4 rounded-2xl border bg-rose-500/5 border-rose-500/25 space-y-3">
            <p className="text-xs ui-dim leading-relaxed">
              {isEn
                ? 'When member Supporter durations expire or SP Coins are withdrawn, the total Clan SP may drop, causing the Clan to demote to a lower Tier (e.g. from Tier 4 down to Tier 1).'
                : 'Khi thời hạn Supporter của thành viên giảm/hết hạn hoặc bị rút SP Coin, tổng điểm SP của Clan có thể bị sụt giảm khiến Clan bị hạ cấp xuống Tier thấp hơn (ví dụ từ Tier 4 tụt xuống Tier 1).'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border space-y-1 bg-black/10 dark:bg-black/30 border-rose-500/20">
                <span className="font-bold text-rose-400 block text-[11px] uppercase tracking-wider">
                  {isEn ? '7-Day Grace Period' : '7 Ngày Ân Hạn Bù SP'}
                </span>
                <p className="text-[11px] ui-dim leading-relaxed">
                  {isEn
                    ? 'The Clan has exactly 7 days to donate/compensate SP back to the required Tier. During this time, higher tier members are temporarily maintained.'
                    : 'Clan có đúng 7 ngày ân hạn để các thành viên đóng góp bù lại số điểm SP thiếu hụt nhằm lấy lại Tier tương ứng.'}
                </p>
              </div>

              <div className="p-3 rounded-xl border space-y-1 bg-black/10 dark:bg-black/30 border-rose-500/20">
                <span className="font-bold text-rose-400 block text-[11px] uppercase tracking-wider">
                  {isEn ? 'Auto-Eviction of Excess Members' : 'Tự Động Đá Thành Viên Vượt Quá'}
                </span>
                <p className="text-[11px] ui-dim leading-relaxed">
                  {isEn
                    ? 'If not compensated after 7 days, all members exceeding the new tier limit will be automatically kicked from the clan.'
                    : 'Nếu sau 7 ngày không bù đủ SP, tất cả thành viên vượt quá giới hạn sức chứa của Tier hiện tại sẽ bị hệ thống tự động mời ra khỏi Clan.'}
                </p>
              </div>
            </div>

            <div className="pt-1 border-t border-rose-500/20">
              <span className="text-[11px] font-bold text-rose-400 block mb-1">
                {isEn ? 'Eviction Priority Order:' : 'Thứ tự ưu tiên lọc thành viên bị đá:'}
              </span>
              <ol className="text-xs ui-dim space-y-1 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                <li>
                  {isEn
                    ? 'Non-role members (MEMBER) who are least active / have not logged in for the longest time.'
                    : 'Ưu tiên những thành viên không có chức vụ (MEMBER) và ít hoạt động nhất (dựa trên lần đăng nhập gần nhất).'}
                </li>
                <li>
                  {isEn
                    ? 'Members who pledged least SP Coins (0 SP pledged members are kicked first).'
                    : 'Sau đó là những thành viên đóng góp SP Coin ít hơn (người đóng góp 0 SP bị đá trước).'}
                </li>
                <li>
                  {isEn
                    ? 'Moderators with least activity / least SP pledged if capacity is still exceeded.'
                    : 'Nếu vẫn vượt giới hạn: Kiểm duyệt viên (MODERATOR) ít hoạt động / đóng góp ít SP nhất.'}
                </li>
                <li>
                  <strong className="text-rose-400 font-bold">
                    {isEn ? 'Clan Leader is NEVER kicked under any circumstances.' : 'Trưởng Clan (LEADER) tuyệt đối không bao giờ bị đá khỏi Clan.'}
                  </strong>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ui-title hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border-ui)' }}
          >
            {isEn ? 'Close' : 'Đã hiểu'}
          </button>
        </div>
      </div>
    </div>
  );
}
