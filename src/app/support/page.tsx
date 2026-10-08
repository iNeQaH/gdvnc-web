'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Heart } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { supportQrUrl, supportTransferContent, calculateSupportPrice } from '@/lib/supportPayment';

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = value;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function SupportPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  // Default to 1 month
  const [months, setMonths] = useState<number>(1);
  const [targetUsername, setTargetUsername] = useState('');

  // Hydrate user on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gdvnc_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      setTargetUsername(String(user?.username || '').trim());
    } catch {
      // do nothing
    }
  }, []);

  const transferContent = useMemo(
    () => (targetUsername ? supportTransferContent(targetUsername, months) : ''),
    [targetUsername, months]
  );
  
  const qrUrl = useMemo(
    () => (targetUsername ? supportQrUrl(targetUsername, months) : supportQrUrl('')),
    [targetUsername, months]
  );
  
  const priceInfo = useMemo(() => calculateSupportPrice(months), [months]);

  const handleCopy = async (value: string, fallbackMsg: string) => {
    const ok = await copyText(value);
    showToast(ok ? fallbackMsg : t('support.copy_fail'), ok ? 'success' : 'error');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section className="ui-card p-6 sm:p-10 text-center space-y-4 relative overflow-hidden">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase"
          style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}
        >
          <Heart className="w-3.5 h-3.5 fill-current" /> GDVN Support
        </div>
        <div className="space-y-2 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight ui-title">{t('support.title')}</h1>
          <p className="text-xs sm:text-sm ui-dim leading-relaxed">{t('support.desc')}</p>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: '#ec4899' }}>
            {t('support.no_perks')}
          </p>
        </div>
      </section>

      <div className="ui-card p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Cột trái: Form nhập liệu & tính toán */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase ui-dim">Tên người dùng nhận Supporter</label>
              <input
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (Ví dụ: iNeQaH)"
                className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:border-pink-500 transition-colors"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              />
              <p className="text-[11px] ui-dim">Bạn có thể tặng Role cho bản thân hoặc bạn bè.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase ui-dim flex justify-between items-center">
                <span>Số tháng đăng ký</span>
                <span className="text-pink-500 text-sm">{months} Tháng</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="36" 
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: 'var(--border-ui)' }}
              />
              <div className="flex justify-between text-[10px] ui-dim font-medium">
                <span>1 Tháng</span>
                <span>36 Tháng</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 space-y-2 text-sm">
              <div className="flex justify-between items-center text-pink-500">
                <span className="font-semibold">Mức giá gốc:</span>
                <span className="line-through opacity-70">{priceInfo.originalPrice.toLocaleString('vi-VN')}đ</span>
              </div>
              {priceInfo.discountPercent > 0 && (
                <div className="flex justify-between items-center text-pink-500">
                  <span className="font-semibold">Chiết khấu (Giảm {priceInfo.discountPercent}%):</span>
                  <span>-{(priceInfo.originalPrice - priceInfo.totalPrice).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="flex justify-between items-center text-pink-600 font-black text-lg pt-2 border-t border-pink-500/20">
                <span>Thành tiền:</span>
                <span>{priceInfo.totalPrice.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            
            <p className="text-xs ui-dim leading-relaxed italic">
              * Ưu đãi: Mỗi 3 tháng tặng kèm 5% chiết khấu. Support sẽ tự động gỡ bỏ khi hết hạn.
            </p>
          </div>

          {/* Cột phải: QR Code */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border-subtle)' }}>
            {targetUsername ? (
              <div className="text-center space-y-4">
                <img
                  src={qrUrl}
                  alt="VietQR Auto Payment"
                  className="w-56 h-56 rounded-2xl object-contain bg-white shadow-xl mx-auto"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold ui-dim">Mã QR Auto-Supporter</p>
                  <button 
                    onClick={() => handleCopy(transferContent, 'Đã copy nội dung chuyển khoản!')}
                    className="flex items-center justify-center gap-1.5 mx-auto bg-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors shadow-md"
                  >
                    <span>{transferContent}</span>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[10px] ui-dim mt-2 max-w-xs mx-auto">
                    Mã QR đã chứa sẵn số tiền và lời nhắn. Tiền vừa tới là có nick màu ngay lập tức!
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-56 space-y-3 text-center px-4">
                <div className="p-4 bg-pink-500/10 rounded-full text-pink-500">
                  <Heart className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold ui-title">Vui lòng nhập tên người dùng</p>
                <p className="text-xs ui-dim">Hệ thống cần biết bạn tặng role cho ai để tạo mã QR.</p>
                <Link href="/login?next=/support" className="text-xs font-bold text-pink-500 hover:underline">
                  Hoặc đăng nhập ngay
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
