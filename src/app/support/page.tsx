'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Heart } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { SUPPORT_BANK, supportQrUrl, supportTransferContent } from '@/lib/supportPayment';

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
  const [username, setUsername] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gdvnc_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      setUsername(String(user?.username || '').trim());
    } catch {
      setUsername('');
    }
  }, []);

  const transferContent = useMemo(
    () => (username ? supportTransferContent(username) : ''),
    [username]
  );

  const handleCopy = async (value: string, okKey: 'support.copied_acc' | 'support.copied_content') => {
    const ok = await copyText(value);
    showToast(ok ? t(okKey) : t('support.copy_fail'), ok ? 'success' : 'error');
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
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={supportQrUrl()}
            alt="VietQR VietinBank"
            className="w-44 h-44 rounded-2xl object-contain bg-white shrink-0 mx-auto sm:mx-0"
          />
          <div className="p-4 rounded-2xl ui-subtle space-y-2 text-xs w-full">
            <Row label={t('support.payment_bank')} value={SUPPORT_BANK.name} />
            <CopyRow
              label={t('support.payment_acc')}
              value={SUPPORT_BANK.account}
              onCopy={() => handleCopy(SUPPORT_BANK.account, 'support.copied_acc')}
            />
            <Row label={t('support.payment_owner')} value={SUPPORT_BANK.owner} />
            {transferContent ? (
              <CopyRow
                label={t('support.payment_content')}
                value={transferContent}
                onCopy={() => handleCopy(transferContent, 'support.copied_content')}
              />
            ) : (
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="ui-dim w-40 shrink-0">{t('support.payment_content')}</span>
                <Link href="/login?next=/support" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                  {t('support.need_login')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="ui-dim w-40 shrink-0">{label}</span>
      <strong className="ui-title font-mono">{value}</strong>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="ui-dim w-40 shrink-0">{label}</span>
      <button type="button" onClick={onCopy} className="flex items-center gap-1.5 text-left min-w-0">
        <strong className="ui-title font-mono truncate">{value}</strong>
        <Copy className="w-3.5 h-3.5 ui-dim shrink-0" />
      </button>
    </div>
  );
}
