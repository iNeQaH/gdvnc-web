'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function solvePow(seed: string, difficulty: number): Promise<string> {
  const prefix = '0'.repeat(difficulty);
  for (let n = 0; n < 8_000_000; n++) {
    const nonce = n.toString(36);
    const hex = await sha256Hex(`${seed}:${nonce}`);
    if (hex.startsWith(prefix)) return nonce;
    if (n % 250 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error('pow timeout');
}

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'fail'>('idle');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const started = useRef(false);

  const run = async (turnstileToken = '') => {
    setStatus('working');
    try {
      const chalRes = await fetch('/api/auth/captcha');
      const chal = await chalRes.json();
      if (!chalRes.ok || !chal.success || !chal.seed) throw new Error('challenge');
      if (chal.turnstileRequired && !turnstileToken) throw new Error('turnstile');
      const nonce = await solvePow(chal.seed, Number(chal.difficulty) || 4);
      const res = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: chal.seed, nonce, turnstileToken }),
      });
      const data = await res.json();
      if (!data.success || !data.token) throw new Error('verify');
      setStatus('ok');
      onVerifyRef.current(data.token);
    } catch {
      setStatus('fail');
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!TURNSTILE_SITE_KEY) {
      void run();
      return;
    }

    const boot = () => {
      const ts = (window as any).turnstile;
      if (!ts || !widgetRef.current || widgetId.current != null) return;
      widgetId.current = ts.render(widgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          void run(token);
        },
      });
    };

    if ((window as any).turnstile) {
      boot();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = boot;
    document.head.appendChild(script);
  }, []);

  return (
    <div
      className="w-full rounded-xl border bg-[var(--bg-subtle)] px-3 py-2.5 space-y-2"
      style={{ borderColor: 'var(--border-ui)' }}
    >
      {TURNSTILE_SITE_KEY ? <div ref={widgetRef} className="flex justify-center" /> : null}
      <div className="flex items-center justify-center text-xs font-bold min-h-8">
        {status === 'ok' ? (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--badge-green-text)' }}>
            <ShieldCheck className="w-4 h-4" /> {t('auth.captcha_success')}
          </span>
        ) : status === 'working' || status === 'idle' ? (
          <span className="flex items-center gap-1.5 ui-dim">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('auth.captcha_checking')}
          </span>
        ) : (
          <button type="button" onClick={() => void run()} className="ui-dim underline cursor-pointer">
            {t('auth.captcha_fail')}
          </button>
        )}
      </div>
    </div>
  );
}
