'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function GdUnverifiedNotice() {
  const { t } = useLanguage();
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold border"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        color: '#d97706',
      }}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        {t('gd.unverified_before')}
        <Link href="/helps" className="font-black underline underline-offset-2 hover:opacity-80">
          {t('nav.helps')}
        </Link>
        {t('gd.unverified_after')}
      </p>
    </div>
  );
}
