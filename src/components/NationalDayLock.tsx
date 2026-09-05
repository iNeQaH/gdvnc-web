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
          <span>Chế độ bảo trì đang bật — chỉ siêu admin thấy thanh này.</span>
          <button type="button" onClick={unlock} disabled={busy}>
            {busy ? 'Đang tắt…' : 'Tắt chế độ này, mở lại website'}
          </button>
          {err ? <span>{err}</span> : null}
        </div>
      ) : null}

      <article className="qk-paper" style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <header className="qk-masthead" style={{ borderBottom: 'none' }}>
          <p className="qk-kicker">Thông báo từ GDVN</p>
          <h1>BẢO TRÌ HỆ THỐNG</h1>
          <p className="qk-sub">Website hiện đang tạm khóa để nâng cấp và tối ưu hóa hệ thống.</p>
        </header>

        <p className="qk-lead" style={{ marginTop: '2rem' }}>
          Cảm ơn bạn đã ghé thăm. Để đảm bảo trải nghiệm tốt hơn cho cộng đồng, chúng tôi đang thực hiện một số nâng cấp về cơ sở dữ liệu và máy chủ.
        </p>

        <p>
          Thời gian bảo trì dự kiến sẽ sớm kết thúc. Vui lòng quay lại sau!
        </p>
      </article>
    </div>
  );
}
