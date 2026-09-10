'use client';

import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  Trophy,
  Gamepad2,
  ListChecks,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function GuidelinesPage() {
  const { t } = useLanguage();

  const tocItems = [
    { id: 'sec-1', label: '1. Hướng Dẫn Tạo & Xác Minh Tài Khoản', icon: ShieldCheck },
    { id: 'sec-2', label: '2. Quy Định GDVN Classic List', icon: Trophy },
    { id: 'sec-3', label: '3. Quy Định GDVN Challenge List', icon: ListChecks },
    { id: 'sec-4', label: '4. Quy Định GDVN Platformer List', icon: Gamepad2 },
    { id: 'sec-5', label: '5. Quy Định Sử Dụng Website & Cộng Đồng', icon: Info },
    { id: 'sec-6', label: '6. Khiếu Nại & Xử Lý Vi Phạm', icon: ShieldAlert },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <BookOpen className="w-4 h-4" /> Official Guidelines
          </div>
          <h1 className="text-2xl sm:text-3xl font-black ui-title tracking-tight">
            Luật & Quy Định Geometry Dash Việt Nam
          </h1>
          <p className="text-xs sm:text-sm ui-dim max-w-2xl leading-relaxed">
            Tổng hợp các tiêu chuẩn xét duyệt kỷ lục, quy định nộp tác phẩm và bộ quy tắc ứng xử dành cho toàn thể thành viên cộng đồng GDVN.
          </p>
        </div>
      </div>

      {/* Table of Contents (Mục Lục) */}
      <div
        className="p-5 sm:p-6 rounded-2xl border space-y-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        <h2 className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-sky-400" /> Mục Lục Nội Dung
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tocItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="flex items-center justify-between p-3 rounded-xl border text-xs font-bold text-left transition-all hover:border-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer group"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-title)',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 ui-dim group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Hướng Dẫn Tạo & Xác Minh Tài Khoản */}
      <section
        id="sec-1"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">1. Hướng Dẫn Tạo & Xác Minh Tài Khoản</h2>
            <p className="text-xs ui-dim">Đăng ký tài khoản GDVN và liên kết tên người chơi Geometry Dash chính thức.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm leading-relaxed ui-title">
          <p>
            Để nộp kỷ lục (Records) hoặc tác phẩm (Works) trên GDVN, bạn cần đăng ký một tài khoản thành viên chính thức.
          </p>

          <ul className="space-y-2 list-disc list-inside ui-dim">
            <li>
              <strong className="ui-title">Đăng ký tài khoản:</strong> Sử dụng email cá nhân hợp lệ (Gmail, Outlook, Yahoo...) để nhận mã OTP xác nhận tài khoản.
            </li>
            <li>
              <strong className="ui-title">Xác minh GD Username:</strong> Điền chính xác GD Username của bạn trong trang Cá nhân. Ban Quản Trị sẽ đối soát và gắn tích xanh <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-600 bg-emerald-500/10"><ShieldCheck className="w-3 h-3" /> Verified</span> cho tài khoản chính chủ.
            </li>
            <li>
              <strong className="ui-title">Bảo mật tài khoản:</strong> Mọi thành viên chịu trách nhiệm bảo quản mật khẩu của mình. Không chia sẻ tài khoản hoặc sử dụng chung tài khoản với người khác.
            </li>
            <li>
              <strong className="ui-title">Yêu cầu Xoá tài khoản:</strong> Nếu bạn muốn xoá tài khoản, cần thực hiện tại trang Profile cá nhân và nhập đầy đủ lý do muốn xoá. BQT sẽ lưu lại thông tin yêu cầu xoá để làm bằng chứng kiểm toán.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2: Quy Định GDVN Classic List */}
      <section
        id="sec-2"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">2. Quy Định GDVN Classic List</h2>
            <p className="text-xs ui-dim">Tiêu chuẩn kiểm duyệt kỷ lục màn chơi Classic Demon List (1-11).</p>
          </div>
        </div>

        <ol className="space-y-3 text-xs sm:text-sm leading-relaxed list-decimal list-inside ui-title">
          <li className="pl-1">
            Chỉ chấp nhận các bản Geometry Dash chính thức từ RobTop Games hoặc Geode Modloader đạt chuẩn cộng đồng.
          </li>
          <li className="pl-1">
            Record phải đi kèm link video proof hoạt động công khai (YouTube/Twitch) với độ phân giải tối thiểu <strong>720p 60fps</strong> (hoặc rõ nét, nghe rõ tiếng click/tap thực tế).
          </li>
          <li className="pl-1">
            <strong className="text-red-500">Cấm hoàn toàn mọi hình thức hack/cheat:</strong> Noclip, Speedhack, Bot, Auto-Clicker, Macro, Layout Switch Hack, ZBot, Physics Alteration Mod...
          </li>
          <li className="pl-1">
            <strong>Quy định về CBF (Click Between Frames):</strong> Chấp nhận CBF chính thức từ Geode Modloader với điều kiện người chơi phải chọn đúng tùy chọn CBF/FPS khi gửi kỷ lục.
          </li>
          <li className="pl-1">
            Người chơi phải sẵn sàng cung cấp <strong>Raw Footages / Raw Proof</strong> không qua chỉnh sửa nếu có yêu cầu đối soát từ BQT (đặc biệt đối với Top 100 Classic List).
          </li>
          <li className="pl-1">
            Mức phần trăm hoàn thành tối thiểu (minPercent) tính điểm phụ thuộc vào quy định riêng của từng màn chơi trên Demonlist.
          </li>
          <li className="pl-1">
            Người chơi phải khai báo trung thực loại thiết bị (PC, Android, iOS) và số Hz/FPS khi thi đấu.
          </li>
          <li className="pl-1">
            <strong>Low Detail Mode (LDM):</strong> Chỉ được phép sử dụng LDM có sẵn trong level hoặc LDM chuẩn được cộng đồng/creator công nhận. Không cắt giảm hitbox hay xóa object làm thay đổi gameplay gốc.
          </li>
          <li className="pl-1">
            Không lợi dụng Secret Way, Physics Bug hoặc Glitch ngoài ý muốn của creator để vượt qua màn chơi.
          </li>
          <li className="pl-1">
            Kỷ lục phải do chính chủ tài khoản tự hoàn thành (nghiêm cấm mọi hành vi nhờ người khác chơi hộ - pilot).
          </li>
          <li className="pl-1">
            Mọi hành vi cắt ghép video (splice), chỉnh sửa âm thanh giả lập hoặc gian lận proof sẽ bị <strong>khóa tài khoản vĩnh viễn</strong>.
          </li>
        </ol>
      </section>

      {/* Section 3: Quy Định GDVN Challenge List */}
      <section
        id="sec-3"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">3. Quy Định GDVN Challenge List</h2>
            <p className="text-xs ui-dim">Quy tắc dành cho các màn chơi độ khó cực cao thời lượng ngắn (Challenge).</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed ui-title">
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase ui-dim flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" /> A. Tiêu chuẩn xếp hạng Challenge Level
            </h3>
            <ul className="list-disc list-inside space-y-1.5 ui-dim pl-2">
              <li>Màn chơi Challenge là các màn có thời lượng ngắn (thường &lt; 30 giây) tập trung vào một kỹ năng cụ thể (Straight Fly, Wave micro-click, Spam...).</li>
              <li>Level Challenge phải được BQT phê duyệt và gắn nhãn Challenge trong hệ thống.</li>
              <li>Điểm hoàn thành Challenge không tính vào tổng điểm Classic PP chính thức nhưng có bảng xếp hạng Challenge riêng biệt.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase ui-dim flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" /> B. Quy định Submit kỷ lục Challenge
            </h3>
            <ul className="list-disc list-inside space-y-1.5 ui-dim pl-2">
              <li>Bắt buộc phải quay lại video kèm tiếng micro/click rõ ràng và giữ lại Raw Video.</li>
              <li>Chỉ tính kỷ lục đạt <strong>100% Completion</strong> (không tính điểm phần trăm tiến độ).</li>
              <li>Áp dụng nghiêm ngặt các quy định cấm hack tương tự Classic List.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: Quy Định GDVN Platformer List */}
      <section
        id="sec-4"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">4. Quy Định GDVN Platformer List</h2>
            <p className="text-xs ui-dim">Tiêu chuẩn tính thời gian và xét duyệt kỷ lục chế độ Platformer (1-6).</p>
          </div>
        </div>

        <ol className="space-y-3 text-xs sm:text-sm leading-relaxed list-decimal list-inside ui-title">
          <li className="pl-1">
            Video record Platformer phải quay liền mạch toàn bộ quá trình chơi từ Start Point đến khi chạm End Trigger / Finish Screen.
          </li>
          <li className="pl-1">
            Thời gian hoàn thành (Time Ms) được căn cứ theo đồng hồ In-game Timer hoặc đo chính xác qua số khung hình video (Frame Counting).
          </li>
          <li className="pl-1">
            Nghiêm cấm sử dụng Checkpoint Teleport Hack, Speedhack, Pause Delay Exploit hoặc Physics Mod để rút ngắn thời gian.
          </li>
          <li className="pl-1">
            Chấp nhận các Mod hiển thị thông số ingame từ Geode (nghiêm cấm các mod can thiệp physics hoặc trọng lực).
          </li>
          <li className="pl-1">
            Các màn chơi Platformer được xếp hạng theo tiêu chí <strong>Fastest Time (Thời gian hoàn thành nhanh nhất)</strong>.
          </li>
          <li className="pl-1">
            Mọi hành vi cắt ghép video Platformer sẽ bị hủy toàn bộ kỷ lục Platformer và xử lý kỷ luật tài khoản.
          </li>
        </ol>
      </section>

      {/* Section 5: Quy Định Sử Dụng Website & Cộng Đồng */}
      <section
        id="sec-5"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">5. Quy Định Sử Dụng Website & Cộng Đồng</h2>
            <p className="text-xs ui-dim">Quy tắc ứng xử, bảo mật và quyền hạn của Ban Quản Trị.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold ui-title flex items-center gap-1.5 text-xs uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 5.1. Tài khoản & Bảo mật
            </h3>
            <p className="ui-dim text-xs leading-relaxed">
              Mỗi người chơi chỉ được tạo 1 tài khoản duy nhất. Nghiêm cấm tạo clone để spam submission, vote ảo hoặc giả mạo người chơi khác.
            </p>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold ui-title flex items-center gap-1.5 text-xs uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 5.2. Văn hóa phát ngôn
            </h3>
            <p className="ui-dim text-xs leading-relaxed">
              Tôn trọng các thành viên khác và BQT. Nghiêm cấm phát ngôn thù hằn, xúc phạm danh dự, phân biệt vùng miền, đồi trụy hoặc quảng cáo rác.
            </p>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold ui-title flex items-center gap-1.5 text-xs uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 5.3. Đóng góp & Nộp dữ liệu
            </h3>
            <p className="ui-dim text-xs leading-relaxed">
              Không gửi dữ liệu rác (spam submit), không cố tình gửi thông tin sai lệch hoặc dùng bot tấn công API hệ thống GDVN.
            </p>
          </div>

          <div className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold ui-title flex items-center gap-1.5 text-xs uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 5.4. Quyền hạn BQT
            </h3>
            <p className="ui-dim text-xs leading-relaxed">
              Ban Quản Trị GDVN có toàn quyền từ chối record, điều chỉnh xếp hạng, thu hồi điểm PT/CP hoặc khóa tài khoản vi phạm mà không cần báo trước.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Khiếu Nại & Xử Lý Vi Phạm */}
      <section
        id="sec-6"
        className="p-6 rounded-2xl border space-y-4 scroll-mt-20"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black ui-title">6. Khiếu Nại & Xử Lý Vi Phạm</h2>
            <p className="text-xs ui-dim">Quy trình giải quyết tranh chấp và hình phạt đối với hành vi gian lận.</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed ui-title">
          <div className="p-4 rounded-xl border space-y-2 bg-red-500/5 border-red-500/20">
            <h3 className="font-bold text-red-500 flex items-center gap-1.5 text-xs uppercase">
              <AlertTriangle className="w-4 h-4" /> 6.1. Quy trình gửi khiếu nại
            </h3>
            <p className="ui-dim text-xs leading-relaxed">
              Nếu bạn cho rằng kỷ lục của mình bị từ chối nhầm hoặc phát hiện thành viên khác gian lận, hãy gửi tin nhắn trong mục <strong className="ui-title">Gửi hỗ trợ (Helps)</strong>. Cung cấp đầy đủ timestamp, video raw hoặc các bằng chứng cụ thể để BQT xác minh.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase ui-dim">6.2. Khung hình phạt xử lý vi phạm</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20 shrink-0">Mức 1</span>
                <div>
                  <strong className="block ui-title text-xs">Cảnh cáo & Hủy record liên quan</strong>
                  <span className="ui-dim text-xs">Áp dụng đối với hành vi khai báo sai thông tin nhẹ, nhầm lẫn link proof hoặc spam submit 1-2 lần.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500 border border-orange-500/20 shrink-0">Mức 2</span>
                <div>
                  <strong className="block ui-title text-xs">Khóa nộp kỷ lục 30 ngày & Trừ 50% điểm PT/CP</strong>
                  <span className="ui-dim text-xs">Áp dụng đối với hành vi cố tình gian dối thông tin, tái phạm spam hoặc xúc phạm thành viên khác.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-500/20 shrink-0">Mức 3</span>
                <div>
                  <strong className="block ui-title text-xs text-red-500">Xoá tài khoản & Ban vĩnh viễn khỏi GDVN</strong>
                  <span className="ui-dim text-xs">Áp dụng cho mọi hành vi Hack/Cheat, Splice Video, lừa đảo hoặc cố tình phá hoại cộng đồng GDVN.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Support Note */}
      <div className="text-center py-4 border-t ui-dim text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        Nếu có thắc mắc hoặc cần giải đáp thêm về các quy định, vui lòng liên hệ Ban Quản Trị qua mục <a href="/helps" className="text-sky-400 underline font-bold">Gửi Hỗ Trợ</a>.
      </div>
    </div>
  );
}
