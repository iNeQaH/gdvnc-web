'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, User, Mail, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, Send, Lock } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import SmartCaptcha from '@/components/SmartCaptcha';

export default function AuthPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGdUsername, setRegGdUsername] = useState('');
  const [regDiscord, setRegDiscord] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);
  const [sendingResetOtp, setSendingResetOtp] = useState(false);
  const [resetOtpSentMsg, setResetOtpSentMsg] = useState<string | null>(null);

  // Anti-bot Security Challenge
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // OTP sending state
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  const handleSendResetOtp = async () => {
    setError('');
    setResetOtpSentMsg(null);

    if (!resetEmail || !resetEmail.includes('@') || !resetEmail.includes('.')) {
      setError(t('auth.email_invalid'));
      return;
    }

    if (!captchaToken) {
      setError(t('auth.captcha_wrong' as any) || 'Vui lòng xác thực chống bot');
      return;
    }

    setSendingResetOtp(true);
    try {
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, locale: language, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('auth.otp_send_fail'));
        return;
      }
      setResetCooldown(60);
      setResetOtpSentMsg(data.message);
    } catch {
      setError(t('auth.otp_send_error'));
    } finally {
      setSendingResetOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetOtp) {
      setError(t('auth.otp_required'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          password: resetPassword,
          locale: language,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('auth.login_fail'));
        return;
      }
      setSuccessMsg(t('auth.reset_ok'));
      setTimeout(() => {
        setTab('login');
        setSuccessMsg('');
        setResetEmail('');
        setResetOtp('');
        setResetPassword('');
      }, 1500);
    } catch {
      setError(t('common.server_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpSentMsg(null);

    if (!regEmail || !regEmail.includes('@') || !regEmail.includes('.')) {
      setError(t('auth.email_invalid'));
      return;
    }

    // Check anti-bot captcha
    if (!captchaToken) {
      setError(t('auth.captcha_wrong' as any) || 'Vui lòng xác thực chống bot');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, locale: language, captchaToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('auth.otp_send_fail'));
        return;
      }

      setOtpCooldown(60);
      setOtpSentMsg(data.message);
    } catch (err) {
      setError(t('auth.otp_send_error'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
          locale: language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('auth.login_fail'));
        return;
      }

      // Store user
      localStorage.setItem('gdvnc_user', JSON.stringify(data.user));
      if (rememberMe) {
        localStorage.setItem('gdvnc_remember', 'true');
      } else {
        localStorage.removeItem('gdvnc_remember');
      }

      if (data.user.role === 'ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = `/profile/${data.user.username}`;
      }
    } catch (err: any) {
      setError(t('common.server_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verify captcha
    if (!captchaToken) {
      setError(t('auth.captcha_wrong' as any) || 'Vui lòng xác thực chống bot');
      return;
    }

    if (!regOtp) {
      setError(t('auth.otp_required'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          otp: regOtp,
          password: regPassword,
          gdUsername: regGdUsername,
          discordTag: regDiscord,
          locale: language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('auth.register_fail'));
        return;
      }

      localStorage.setItem('gdvnc_user', JSON.stringify(data.user));
      setSuccessMsg(t('auth.register_ok'));
      setTimeout(() => {
        window.location.href = `/profile/${data.user.username}`;
      }, 1000);
    } catch (err: any) {
      setError(t('common.server_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-5 px-4">
      {/* Tabs */}
      <div className="flex items-center justify-center p-1 rounded-2xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
        <button
          onClick={() => { setTab('login'); setError(''); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          style={{
            backgroundColor: tab === 'login' ? 'var(--bg-card)' : 'transparent',
            color: tab === 'login' ? 'var(--accent)' : 'var(--text-dim)',
            boxShadow: tab === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {t('auth.login')}
        </button>
        <button
          onClick={() => { setTab('register'); setError(''); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          style={{
            backgroundColor: tab === 'register' ? 'var(--bg-card)' : 'transparent',
            color: tab === 'register' ? 'var(--accent)' : 'var(--text-dim)',
            boxShadow: tab === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {t('auth.register')}
        </button>
      </div>

      {/* Form Container */}
      <div className="ui-card p-6 sm:p-7 space-y-4">
        {error && (
          <div
            className="p-3 rounded-xl text-xs font-medium flex items-center gap-2"
            style={{
              backgroundColor: 'var(--badge-red-bg)',
              color: 'var(--badge-red-text)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="p-3 rounded-xl text-xs font-medium flex items-center gap-2"
            style={{
              backgroundColor: 'var(--badge-green-bg)',
              color: 'var(--badge-green-text)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.identifier')}</label>
              <div className="relative">
                <User className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={t('auth.identifier_ph')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-sky-500 cursor-pointer accent-sky-500"
                />
                <span className="ui-dim font-medium">{t('auth.remember')}</span>
              </label>
              <button
                type="button"
                onClick={() => { setTab('reset'); setError(''); setSuccessMsg(''); }}
                className="font-semibold hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                {t('auth.forgot_password')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {loading ? t('auth.logging_in') : t('auth.login')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : tab === 'reset' ? (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <p className="text-xs ui-dim leading-relaxed">{t('auth.reset_desc')}</p>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.email')} *</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={sendingResetOtp || resetCooldown > 0 || !resetEmail || !captchaToken}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Send className="w-3 h-3" />
                  {sendingResetOtp ? t('auth.sending') : resetCooldown > 0 ? `${resetCooldown}s` : t('auth.reset_send_otp')}
                </button>
              </div>
              {resetOtpSentMsg && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5 font-medium">
                  {resetOtpSentMsg}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                {t('auth.antibot')} *
              </label>
              <SmartCaptcha onVerify={(token) => setCaptchaToken(token)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.otp')} *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value)}
                placeholder={t('auth.otp_ph')}
                className="w-full px-3 py-2 rounded-xl text-xs border font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.new_password')} *</label>
              <input
                type="password"
                required
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {loading ? t('auth.logging_in') : t('auth.reset_submit')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => { setTab('login'); setError(''); }}
              className="w-full text-xs font-semibold ui-dim hover:opacity-100 cursor-pointer"
            >
              {t('auth.back_to_login')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.username')} *</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder={t('auth.username_ph')}
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>

            {/* Email & Send OTP */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.email')} *</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCooldown > 0 || !regEmail || !captchaToken}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Send className="w-3 h-3" />
                  {sendingOtp ? t('auth.sending') : otpCooldown > 0 ? `${otpCooldown}s` : t('auth.send_otp')}
                </button>
              </div>
              {otpSentMsg && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5 font-medium">
                  {otpSentMsg}
                </p>
              )}
            </div>

            {/* Anti-Bot Challenge */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                {t('auth.antibot')} *
              </label>
              <SmartCaptcha onVerify={(token) => setCaptchaToken(token)} />
            </div>

            {/* OTP Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.otp')} *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={regOtp}
                onChange={(e) => setRegOtp(e.target.value)}
                placeholder={t('auth.otp_ph')}
                className="w-full px-3 py-2 rounded-xl text-xs border font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>



            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">{t('auth.password_min')} *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold ui-dim">{t('auth.gd_optional')}</label>
                <input
                  type="text"
                  value={regGdUsername}
                  onChange={(e) => setRegGdUsername(e.target.value)}
                  placeholder="Ingame name..."
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold ui-dim">{t('auth.discord_optional')}</label>
                <input
                  type="text"
                  value={regDiscord}
                  onChange={(e) => setRegDiscord(e.target.value)}
                  placeholder="user#1234"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {loading ? t('auth.creating') : t('auth.finish')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

