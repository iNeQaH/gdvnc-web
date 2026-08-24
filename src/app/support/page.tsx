'use client';

import React, { useState } from 'react';
import { Heart, ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function SupportPage() {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<number>(1);

  const plans = [
    { months: 1, name: t('support.plan_1m'), price: '20.000đ' },
    { months: 3, name: t('support.plan_3m'), price: '60.000đ' },
    { months: 6, name: t('support.plan_6m'), price: '120.000đ' },
    { months: 12, name: t('support.plan_12m'), price: '240.000đ' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section className="ui-card p-6 sm:p-10 text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
          <Heart className="w-3.5 h-3.5 fill-current" /> GDVNC Support
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight ui-title">
            {t('support.title')}
          </h1>
          <p className="text-xs sm:text-sm ui-dim leading-relaxed">
            {t('support.desc')}
          </p>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: '#ec4899' }}>
            {t('support.no_perks')}
          </p>
        </div>
      </section>

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
                style={{
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)',
                }}
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold ui-title">{plan.name}</span>
                  <div className="text-xl font-black ui-title">
                    {plan.price}
                  </div>
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
          <p className="text-xs ui-dim">
            {t('support.payment_desc')}
          </p>
        </div>

        <div className="p-4 rounded-2xl ui-subtle space-y-2 text-xs w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="ui-dim w-40 shrink-0">{t('support.payment_bank')}</span>
            <strong className="ui-title font-mono">-</strong>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="ui-dim w-40 shrink-0">{t('support.payment_acc')}</span>
            <strong className="ui-title font-mono">-</strong>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="ui-dim w-40 shrink-0">{t('support.payment_owner')}</span>
            <strong className="ui-title font-mono">-</strong>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5">
            <span className="ui-dim w-40 shrink-0">{t('support.payment_status')}</span>
            <strong className="text-amber-500 font-semibold">{t('support.payment_status_val')}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
