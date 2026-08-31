'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/national-day.css';

export default function NationalDayLock({ canUnlock }: { canUnlock: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/site-lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.error || 'Không tắt được.');
        return;
      }
      router.refresh();
    } catch {
      setErr('Mạng lỗi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qk-lock-body">
      {canUnlock ? (
        <div className="qk-admin">
          <span>Chế độ trang Quốc khánh đang bật — chỉ siêu admin thấy thanh này.</span>
          <button type="button" onClick={unlock} disabled={busy}>
            {busy ? 'Đang tắt…' : 'Tắt chế độ này, mở lại website'}
          </button>
          {err ? <span>{err}</span> : null}
        </div>
      ) : null}

      <article className="qk-paper">
        <header className="qk-masthead">
          <p className="qk-kicker">Đặc san · Hà Nội</p>
          <h1>QUỐC KHÁNH 2/9</h1>
          <p className="qk-sub">Tết Độc lập — ngày Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Ba Đình</p>
          <div className="qk-meta">
            <span>Thứ Tư, 2 tháng 9 năm 2026</span>
            <span>Theo Wikipedia tiếng Việt</span>
          </div>
        </header>

        <figure className="qk-figure">
          <img
            className="qk-flag"
            src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg"
            alt="Quốc kỳ Việt Nam"
          />
          <figcaption>Quốc kỳ Việt Nam. Ảnh: Wikimedia Commons.</figcaption>
        </figure>

        <p className="qk-lead">
          Ngày Quốc khánh Việt Nam, hay còn gọi là Tết Độc lập, là ngày lễ chính thức của Việt Nam,
          diễn ra vào ngày 2 tháng 9 hằng năm, kỷ niệm ngày Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn
          độc lập tại Quảng trường Ba Đình, Hà Nội, khai sinh ra nước Việt Nam Dân chủ Cộng hòa,
          một trong các tiền thân của nước Cộng hòa Xã hội chủ nghĩa Việt Nam ngày nay.
        </p>

        <p>
          Mục 4, Điều 13, Chương I Hiến pháp năm 2013 khẳng định: «Quốc khánh nước Cộng hòa xã hội
          chủ nghĩa Việt Nam là ngày Tuyên ngôn độc lập 2 tháng 9 năm 1945». Ý nghĩa của ngày lễ là
          tuyên bố Việt Nam độc lập khỏi thực dân Pháp và đế quốc Nhật Bản, thành lập nhà nước Việt Nam
          Dân chủ Cộng hòa.
        </p>

        <figure className="qk-figure">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Ho_Chi_Minh_1946.jpg"
            alt="Chủ tịch Hồ Chí Minh năm 1946"
          />
          <figcaption>Chủ tịch Hồ Chí Minh, 1946. Ảnh: Wikimedia Commons.</figcaption>
        </figure>

        <h2>Chiều 2 tháng 9 năm 1945 tại Ba Đình</h2>
        <p>
          Chiều ngày 2 tháng 9 năm 1945, hơn 50 vạn người dân Hà Nội tụ họp tại quảng trường Ba Đình
          chào mừng thành lập chính phủ mới. Thay mặt Chính phủ Việt Nam Dân chủ Cộng hòa, Hồ Chí Minh
          đọc bản Tuyên ngôn độc lập. Chương trình được mong đợi bắt đầu lúc 14 giờ, nhưng xe chở nội
          các đến trễ khi phải đi xuyên qua đám đông.
        </p>
        <p>
          Trong khi hầu hết đồng sự trên khán đài mặc vest, Hồ Chí Minh chọn bộ khaki phai màu, cổ cao,
          dép cao su trắng. Sau chào cờ và quốc ca, Võ Nguyên Giáp giới thiệu Người. Hồ Chí Minh hỏi:
          «Đồng bào có nghe tôi nói rõ không?» — đám đông đồng thanh: «Rõ!».
        </p>
        <p>
          Bản Tuyên ngôn kêu gọi các nước Đồng minh ủng hộ nền độc lập vừa giành được qua Cách mạng
          Tháng Tám, hủy bỏ các hiệp ước Pháp ký liên quan đến Việt Nam, và khẳng định nhân dân «kiên
          quyết chống lại âm mưu của bọn thực dân Pháp».
        </p>

        <figure className="qk-figure">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/87/Ho_Chi_Minh_Mausoleum.jpg"
            alt="Quảng trường Ba Đình — Lăng Chủ tịch Hồ Chí Minh"
          />
          <figcaption>Lăng Chủ tịch Hồ Chí Minh tại Ba Đình, Hà Nội. Ảnh: Wikimedia Commons.</figcaption>
        </figure>

        <h2>Vì sao chọn ngày 2 tháng 9</h2>
        <p>
          Có ý kiến cho rằng ngày 2 tháng 9 năm 1945 rơi vào Chủ nhật, trùng lễ kính các thánh tử đạo
          Việt Nam, thuận để đồng bào tham dự mít-tinh. Theo nhà sử học Nguyễn Quang Liệu, việc chọn
          ngày còn nhằm trùng thời điểm Nhật chính thức đầu hàng Đồng minh. Hồ Chí Minh viết Tuyên ngôn
          vào 28–29 tháng 8; lễ đọc không thể muộn hơn vì quân Tưởng đã bắt đầu vào Việt Nam.
        </p>

        <h2>Nghỉ lễ</h2>
        <p>
          Theo Điều 112 Bộ luật Lao động 2019, người lao động được nghỉ Quốc khánh hai ngày: ngày 2
          tháng 9 và một ngày liền kề trước hoặc sau. Năm 2026, ngày 2 tháng 9 rơi vào thứ Tư.
        </p>

        <p className="qk-source">
          Bài được biên tập từ mục «Ngày Quốc khánh (Việt Nam)» trên{' '}
          <a href="https://vi.wikipedia.org/wiki/Ng%C3%A0y_Qu%E1%BB%91c_kh%C3%A1nh_(Vi%E1%BB%87t_Nam)">
            Wikipedia tiếng Việt
          </a>
          , giấy phép CC BY-SA. Ảnh Wikimedia Commons.
        </p>
      </article>
    </div>
  );
}
