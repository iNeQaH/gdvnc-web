'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import GdVerifyModal from '@/components/GdVerifyModal';

export default function GdUnverifiedNotice({
  gdUsername = '',
  onVerified,
}: {
  gdUsername?: string;
  onVerified?: () => void;
}) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl text-xs font-semibold border shadow-xs"
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
          color: '#d97706',
        }}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Bạn cần xác minh tài khoản GD của mình để có record, stat và xuất hiện trên bảng xếp hạng!
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Xác minh</span>
        </button>
      </div>

      <GdVerifyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialGdUsername={gdUsername}
        onSuccess={() => {
          if (onVerified) onVerified();
        }}
      />
    </>
  );
}
