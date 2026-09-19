'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'fail'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  // Cloudflare Turnstile mode (active only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is explicitly configured)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let isMounted = true;

    const renderWidget = () => {
      const ts = (window as any).turnstile;
      if (!ts || !containerRef.current) return;
      if (widgetIdRef.current !== null) {
        try {
          ts.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = ts.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'auto',
          callback: async (turnstileToken: string) => {
            if (!isMounted) return;
            setStatus('working');
            try {
              const res = await fetch('/api/auth/captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turnstileToken }),
              });
              const data = await res.json();
              if (data.success && data.token) {
                if (isMounted) {
                  setStatus('ok');
                  onVerifyRef.current(data.token);
                }
              } else {
                if (isMounted) {
                  setStatus('fail');
                  setErrorMsg(data.error || 'Xác thực Cloudflare thất bại.');
                }
              }
            } catch {
              if (isMounted) {
                setStatus('fail');
                setErrorMsg('Không thể kết nối với máy chủ.');
              }
            }
          },
          'expired-callback': () => {
            if (isMounted) setStatus('idle');
          },
          'error-callback': () => {
            if (isMounted) setStatus('fail');
          },
        });
      } catch (err) {
        console.error('Turnstile render error:', err);
      }
    };

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[data-gdvnc-turnstile]');
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.gdvncTurnstile = '1';
        script.onload = renderWidget;
        script.onerror = () => {
          if (isMounted) setStatus('fail');
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Built-in 1-click verification (when TURNSTILE_SITE_KEY is not configured)
  const handleBuiltinVerify = async () => {
    if (status === 'working' || status === 'ok') return;
    setStatus('working');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setStatus('ok');
        onVerifyRef.current(data.token);
      } else {
        setStatus('fail');
        setErrorMsg(data.error || 'Xác minh thất bại.');
      }
    } catch {
      setStatus('fail');
      setErrorMsg('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <div
      className="w-full rounded-xl border bg-[var(--bg-subtle)] p-3 space-y-2 text-center"
      style={{ borderColor: 'var(--border-ui)' }}
      data-gdvnc-human="1"
    >
      {status === 'ok' ? (
        <div className="flex items-center justify-center text-xs font-bold py-2" style={{ color: 'var(--badge-green-text)' }}>
          <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" />
          {t('auth.captcha_success')}
        </div>
      ) : TURNSTILE_SITE_KEY ? (
        <div className="space-y-2">
          <div ref={containerRef} className="flex justify-center min-h-[65px]" />
          {status === 'fail' && (
            <p className="text-xs text-rose-500 font-medium">
              {errorMsg || t('auth.captcha_fail')}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleBuiltinVerify}
          disabled={status === 'working'}
          className="w-full min-h-11 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 select-none border transition-colors hover:bg-[var(--bg-card)]"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)',
          }}
        >
          {status === 'working' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              {t('auth.captcha_checking')}
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              {status === 'fail' ? (errorMsg || t('auth.captcha_fail')) : (t('auth.captcha_instruction') || 'Tôi không phải là người máy (Bấm để xác minh)')}
            </>
          )}
        </button>
      )}
    </div>
  );
}
