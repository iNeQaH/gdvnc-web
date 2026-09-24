'use client';

import React from 'react';
import { ScrollText } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import ChangeLogTab from '@/components/ChangeLogTab';

export default function ChangelogPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--border-ui)' }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5 ui-title">
            <ScrollText className="w-6 h-6 shrink-0" style={{ color: 'var(--accent)' }} />
            {t('nav.changelog')}
          </h1>
          <p className="text-xs ui-dim max-w-xl">
            Lịch sử theo dõi các thay đổi về thứ hạng top 150, bổ sung màn chơi mới và cập nhật rating trên Demon List & Pemon List.
          </p>
        </div>
      </div>

      {/* Main Channel Log Component */}
      <ChangeLogTab />
    </div>
  );
}
