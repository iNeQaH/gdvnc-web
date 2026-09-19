'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'ok' | 'fail'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  useEffect(() => {
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
            setStatus('verifying');
            setErrorMsg('');
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
                setErrorMsg('Không kết nối được với máy chủ xác thực.');
              }
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              setStatus('idle');
            }
          },
          'error-callback': () => {
            if (isMounted) {
              setStatus('fail');
              setErrorMsg('Lỗi khi tải xác minh Cloudflare Turnstile.');
            }
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
          if (isMounted) {
            setStatus('fail');
            setErrorMsg('Không thể tải script Cloudflare Turnstile.');
          }
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReset = () => {
    setStatus('idle');
    setErrorMsg('');
    const ts = (window as any).turnstile;
    if (ts && widgetIdRef.current !== null) {
      try {
        ts.reset(widgetIdRef.current);
      } catch {}
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
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          {t('auth.captcha_success')}
        </div>
      ) : (
        <div className="space-y-2">
          <div ref={containerRef} className="flex justify-center min-h-[65px]" />
          {status === 'fail' && (
            <div className="flex items-center justify-between text-xs text-rose-500 font-medium px-1">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg || t('auth.captcha_fail')}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs font-bold text-sky-500 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {t('common.retry') || 'Thử lại'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
