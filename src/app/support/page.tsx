'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Zap, 
  Coins, 
  Gift, 
  Tv, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Play,
  X,
  Send
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function SupporterPage() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [spBalance, setSpBalance] = useState<number>(0);
  const [supporterUntil, setSupporterUntil] = useState<string | null>(null);

  // Ad simulation modal
  const [isWatchingAd, setIsWatchingAd] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [adSuccessMsg, setAdSuccessMsg] = useState<string | null>(null);

  // Transfer SP Form
  const [recipient, setRecipient] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('100');
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferMsg, setTransferMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Redeem Loading
  const [redeemLoading, setRedeemLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        fetchBalance(u.id);
      } catch (e) {}
    }
  }, []);

  const fetchBalance = async (userId: string) => {
    try {
      const res = await fetch('/api/support/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_BALANCE', userId }),
      });
      const data = await res.json();
      if (data.success) {
        setSpBalance(data.spPoints || 0);
        setSupporterUntil(data.supporterUntil || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. WATCH AD (Temporarily disabled as requested)
  const handleStartWatchAd = () => {
    alert(t('support.ad_alert'));
  };

  const claimAdReward = async () => {
    try {
      const res = await fetch('/api/support/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EARN_AD',
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSpBalance(data.spPoints);
        setAdSuccessMsg(t('support.ad_reward_ok'));
      }
    } catch (e) {
      alert(t('support.ad_claim_error'));
    }
  };

  // 2. REDEEM 1 MONTH SUPPORTER
  const handleRedeemMonth = async () => {
    if (!currentUser) return;
    if (spBalance < 1000) {
      setActionMsg({ text: t('support.need_sp'), isError: true });
      return;
    }

    if (!confirm(t('support.confirm_redeem'))) return;

    setRedeemLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/support/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REDEEM_MONTH',
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSpBalance(data.spPoints);
        setSupporterUntil(data.supporterUntil);
        setActionMsg({ text: t('support.redeem_ok'), isError: false });
        
        // Update local user
        const updatedUser = { ...currentUser, supporterUntil: data.supporterUntil };
        localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
      } else {
        setActionMsg({ text: data.error || t('support.redeem_fail'), isError: true });
      }
    } catch (e) {
      setActionMsg({ text: t('common.server_error'), isError: true });
    } finally {
      setRedeemLoading(false);
    }
  };

  // 3. TRANSFER SP POINTS
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setTransferLoading(true);
    setTransferMsg(null);
    try {
      const res = await fetch('/api/support/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRANSFER',
          userId: currentUser.id,
          recipientUsername: recipient,
          amount: transferAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSpBalance(data.spPoints);
        setTransferMsg({ text: data.message, isError: false });
        setRecipient('');
      } else {
        setTransferMsg({ text: data.error || t('support.gift_fail'), isError: true });
      }
    } catch (e) {
      setTransferMsg({ text: t('common.server_error'), isError: true });
    } finally {
      setTransferLoading(false);
    }
  };

  const plans = [
    { months: 1, name: t('support.plan_1m'), price: '20.000đ' },
    { months: 3, name: t('support.plan_3m'), price: '60.000đ' },
    { months: 6, name: t('support.plan_6m'), price: '120.000đ' },
    { months: 12, name: t('support.plan_12m'), price: '240.000đ' },
  ];

  const perks = [
    {
      icon: Sparkles,
      title: t('support.perk1_title'),
      desc: t('support.perk1_desc'),
    },
    {
      icon: Zap,
      title: t('support.perk2_title'),
      desc: t('support.perk2_desc'),
    },
    {
      icon: Coins,
      title: t('support.perk3_title'),
      desc: t('support.perk3_desc'),
    },
    {
      icon: Heart,
      title: t('support.perk4_title'),
      desc: t('support.perk4_desc'),
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Header */}
      <section className="ui-card p-6 sm:p-10 text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
          <Heart className="w-3.5 h-3.5 fill-current" /> GDVNC Supporter Club
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight ui-title">
            {t('support.title')}
          </h1>
          <p className="text-xs sm:text-sm ui-dim leading-relaxed">
            {t('support.desc')}
          </p>
        </div>

        {/* Active Supporter Status & SP Points Balance */}
        {currentUser && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-lg mx-auto">
            <div className="w-full sm:w-auto px-4 py-2 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
              <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{t('support.sp_points')}: <strong className="text-amber-500 text-sm">{currentUser?.role === 'ADMIN' || currentUser?.username === 'iNeQaH' ? '∞' : spBalance.toLocaleString()}</strong> SP</span>
            </div>

            {supporterUntil && new Date(supporterUntil) > new Date() ? (
              <div className="w-full sm:w-auto px-4 py-2 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', borderColor: 'var(--badge-green-text)' }}>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('support.active_until')} {new Date(supporterUntil).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}</span>
              </div>
            ) : (
              <div className="w-full sm:w-auto px-4 py-2 rounded-2xl border flex items-center justify-center gap-2 text-xs ui-dim font-medium" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <span>{t('support.not_active')}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Free SP Points & Ad Reward Section */}
      <div className="ui-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-amber-500">
              <Coins className="w-3.5 h-3.5 fill-current" /> {t(('support.sp_points' as any))}
            </div>
            <h2 className="text-lg font-bold ui-title">{t('support.ad_title')}</h2>
            <p className="text-xs ui-dim">{t('support.ad_disabled')}</p>
          </div>

          {/* Watch Ad Button (Temporarily disabled as requested) */}
          <button
            onClick={handleStartWatchAd}
            disabled={true}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all opacity-50 cursor-not-allowed shrink-0"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
          >
            <Tv className="w-4 h-4" /> {t('support.ad_btn')}
          </button>
        </div>

        {/* SP Actions: Redeem & Gift */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Redeem Card */}
          <div className="p-4 rounded-2xl ui-subtle space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold ui-title">
                <Sparkles className="w-4 h-4 text-pink-500" />
                {t('support.redeem_title')}
              </div>
              <p className="text-[11px] ui-dim" dangerouslySetInnerHTML={{ __html: t('support.redeem_desc').replace('1,000', '<strong>1,000</strong>') }}></p>
            </div>

            {actionMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold ${actionMsg.isError ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {actionMsg.text}
              </div>
            )}

            <button
              onClick={handleRedeemMonth}
              disabled={redeemLoading || spBalance < 1000}
              className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}
            >
              <Check className="w-3.5 h-3.5" />
              {redeemLoading ? t('support.redeem_loading') : t('support.redeem_btn')}
            </button>
          </div>

          {/* Transfer SP Gift Card */}
          <div className="p-4 rounded-2xl ui-subtle space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold ui-title">
                <Gift className="w-4 h-4 text-purple-500" />
                {t('support.gift_title')}
              </div>
              <p className="text-[11px] ui-dim">{t('support.gift_desc')}</p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={t('support.gift_recipient')}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
                <input
                  type="number"
                  placeholder={t('support.gift_amount')}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  min="1"
                  max={spBalance}
                  required
                  className="w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
              </div>

              {transferMsg && (
                <div className={`p-2 rounded-xl text-[11px] font-semibold ${transferMsg.isError ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {transferMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={transferLoading || spBalance < parseInt(transferAmount || '0')}
                className="w-full py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <Send className="w-3.5 h-3.5" />
                {transferLoading ? t('support.gift_loading') : t('support.gift_btn')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Pricing Plans Grid - Pure Donation (No discounts) */}
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

      {/* Payment & Transfer Info (Set to "-" as requested) */}
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

      {/* Perks List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold ui-title text-center">{t('support.perks_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {perks.map((perk, i) => {
            const Icon = perk.icon;
            return (
              <div key={i} className="ui-card p-5 space-y-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold ui-title">{perk.title}</h3>
                <p className="text-xs ui-dim leading-relaxed">{perk.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ad Simulation Modal */}
      {isWatchingAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-center"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-amber-500" />
                {t('support.ad_sponsor')}
              </span>
              {adCountdown === 0 && (
                <button onClick={() => setIsWatchingAd(false)} className="p-1 rounded-lg ui-dim hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Simulated Ad Video Box */}
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-4 text-white space-y-2 shadow-inner">
              <Sparkles className="w-10 h-10 animate-bounce text-yellow-300" />
              <div className="font-extrabold text-base tracking-wide">GDVNC</div>
              <p className="text-xs opacity-80">{t('support.ad_community')}</p>
            </div>

            {/* Countdown / Claim */}
            {adCountdown > 0 ? (
              <div className="space-y-1">
                <div className="text-sm font-black ui-title text-amber-500">
                  {t('support.ad_watching', { n: adCountdown })}
                </div>
                <div className="text-[11px] ui-dim">{t('support.ad_wait')}</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {adSuccessMsg || t('support.ad_claimed')}
                </div>
                <button
                  onClick={() => setIsWatchingAd(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
                >
                  {t('support.ad_close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

