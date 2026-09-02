'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Heart, Landmark, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import {
  SUPPORT_BANK,
  SUPPORT_BANK_APPS,
  isMobileBrowser,
  supportAmount,
  supportBankAppUrl,
  supportQrUrl,
  supportTransferContent,
} from '@/lib/supportPayment';

function formatVnd(amount: number) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

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
  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [showTransfer, setShowTransfer] = useState(false);
  const [username, setUsername] = useState('');
  const [bankApp, setBankApp] = useState<string>(SUPPORT_BANK.appId);
  const [notifying, setNotifying] = useState(false);

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

  const amount = supportAmount(selectedPlan);
  const transferContent = useMemo(
    () => (username ? supportTransferContent(username, selectedPlan) : ''),
    [username, selectedPlan]
  );
  const qrSrc = transferContent ? supportQrUrl(transferContent, amount) : '';
  const payUrl = transferContent ? supportBankAppUrl(bankApp, transferContent, amount) : '';

  const plans = [
    { months: 1, name: t('support.plan_1m'), price: formatVnd(supportAmount(1)) },
    { months: 3, name: t('support.plan_3m'), price: formatVnd(supportAmount(3)) },
    { months: 6, name: t('support.plan_6m'), price: formatVnd(supportAmount(6)) },
    { months: 12, name: t('support.plan_12m'), price: formatVnd(supportAmount(12)) },
  ];

  const openBankApp = (appId: string = bankApp) => {
    if (!transferContent) return;
    const url = supportBankAppUrl(appId, transferContent, amount);
    setBankApp(appId);
    setShowTransfer(true);
    if (isMobileBrowser()) {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = async (value: string, okKey: 'support.copied_acc' | 'support.copied_content') => {
    const ok = await copyText(value);
    showToast(ok ? t(okKey) : t('support.copy_fail'), ok ? 'success' : 'error');
  };

  const handleNotifyPaid = async () => {
    if (!username || notifying) return;
    setNotifying(true);
    try {
      const res = await fetch('/api/support/transfer-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: selectedPlan, content: transferContent, amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('support.notify_fail'), 'error');
        return;
      }
      showToast(t('support.notify_ok'), 'success');
    } catch {
      showToast(t('support.notify_fail'), 'error');
    } finally {
      setNotifying(false);
    }
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

      <div className="ui-card p-5 sm:p-6 space-y-3">
        <h2 className="text-base font-bold ui-title">{t('support.setup_title')}</h2>
        <ol className="space-y-2 text-xs sm:text-sm ui-dim list-decimal pl-5">
          <li>{t('support.setup_1')}</li>
          <li>{t('support.setup_2')}</li>
          <li>{t('support.setup_3')}</li>
          <li>{t('support.setup_4')}</li>
        </ol>
        <p className="text-[11px] ui-dim">{t('support.setup_note')}</p>
      </div>

      <div className="space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold ui-title">{t('support.plans_title')}</h2>
          <p className="text-xs ui-dim">{t('support.plans_desc')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.months;
            return (
              <div
                key={plan.months}
                onClick={() => setSelectedPlan(plan.months)}
                className={`ui-card p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected ? 'border-2' : 'hover:opacity-90'
                }`}
                style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)' }}
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold ui-title">{plan.name}</span>
                  <div className="text-xl font-black ui-title">{plan.price}</div>
                </div>
                <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    className="w-full py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: isSelected ? 'var(--accent-fg)' : 'var(--text-dim)',
                    }}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                    {isSelected ? t('support.plan_selected') : t('support.plan_select')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ui-card p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold ui-title flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            {t('support.payment_title')}
          </h2>
          <p className="text-xs ui-dim">{t('support.payment_desc')}</p>
        </div>

        {!username ? (
          <Link
            href="/login?next=/support"
            className="block w-full py-3 rounded-2xl text-sm font-black text-center"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {t('support.need_login')}
          </Link>
        ) : (
          <a
            href={payUrl || '#'}
            onClick={(e) => {
              e.preventDefault();
              openBankApp();
            }}
            className="block w-full py-3 rounded-2xl text-sm font-black text-center"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {t('support.transfer_btn')}
          </a>
        )}

        {showTransfer && username && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-5">
              <a href={payUrl} onClick={(e) => { e.preventDefault(); openBankApp(); }} className="shrink-0 mx-auto sm:mx-0">
                <img
                  src={qrSrc}
                  alt="VietQR VietinBank"
                  className="w-44 h-44 rounded-2xl object-contain bg-white"
                />
              </a>
              <div className="p-4 rounded-2xl ui-subtle space-y-2 text-xs w-full">
                <Row label={t('support.payment_bank')} value={SUPPORT_BANK.name} />
                <CopyRow
                  label={t('support.payment_acc')}
                  value={SUPPORT_BANK.account}
                  onCopy={() => handleCopy(SUPPORT_BANK.account, 'support.copied_acc')}
                />
                <Row label={t('support.payment_owner')} value={SUPPORT_BANK.owner} />
                <Row label={t('support.payment_amount')} value={formatVnd(amount)} />
                <CopyRow
                  label={t('support.payment_content')}
                  value={transferContent}
                  onCopy={() => handleCopy(transferContent, 'support.copied_content')}
                />
                <p className="text-[11px] ui-dim pt-1">{t('support.content_hint', { user: username, n: selectedPlan })}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> {t('support.open_bank')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORT_BANK_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={supportBankAppUrl(app.id, transferContent, amount)}
                    onClick={(e) => {
                      e.preventDefault();
                      openBankApp(app.id);
                    }}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold border"
                    style={{
                      backgroundColor: bankApp === app.id ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: bankApp === app.id ? 'var(--accent-fg)' : 'var(--text-title)',
                      borderColor: bankApp === app.id ? 'var(--accent)' : 'var(--border-ui)',
                    }}
                  >
                    {app.name}
                  </a>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNotifyPaid}
              disabled={notifying}
              className="w-full py-2.5 rounded-2xl text-xs font-bold border disabled:opacity-50"
              style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              {notifying ? t('support.notify_loading') : t('support.notify_paid')}
            </button>
          </div>
        )}
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
