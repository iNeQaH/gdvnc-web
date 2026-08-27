'use client';

import React, { useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const POW_WORKER_SRC = `
self.onmessage = async (e) => {
  const seed = e.data.seed;
  const difficulty = e.data.difficulty;
  const prefix = '0'.repeat(difficulty);
  const enc = new TextEncoder();
  for (let n = 0; n < 8000000; n++) {
    const nonce = n.toString(36);
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(seed + ':' + nonce));
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    if (hex.startsWith(prefix)) {
      self.postMessage({ nonce: nonce });
      return;
    }
  }
  self.postMessage({ error: true });
};
`;

function solvePowInWorker(seed: string, difficulty: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([POW_WORKER_SRC], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error('timeout'));
    }, 20_000);
    worker.onmessage = (ev) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      if (ev.data?.nonce) resolve(String(ev.data.nonce));
      else reject(new Error('pow'));
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error('worker'));
    };
    worker.postMessage({ seed, difficulty });
  });
}

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'fail'>('idle');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const turnstileReady = useRef(false);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const ensureTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || turnstileReady.current) return;
    const boot = () => {
      const ts = (window as any).turnstile;
      if (!ts || !widgetRef.current || widgetId.current != null) return;
      widgetId.current = ts.render(widgetRef.current, { sitekey: TURNSTILE_SITE_KEY });
      turnstileReady.current = true;
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
  };

  const run = async () => {
    if (status === 'working' || status === 'ok') return;
    setStatus('working');
    try {
      if (TURNSTILE_SITE_KEY) ensureTurnstile();
      const chalRes = await fetch('/api/auth/captcha');
      const chal = await chalRes.json();
      if (!chalRes.ok || !chal.success || !chal.seed) throw new Error('challenge');
      let turnstileToken = '';
      if (TURNSTILE_SITE_KEY && (window as any).turnstile && widgetId.current != null) {
        turnstileToken = (window as any).turnstile.getResponse(widgetId.current) || '';
      }
      if (chal.turnstileRequired && !turnstileToken) throw new Error('turnstile');
      const nonce = await solvePowInWorker(chal.seed, Number(chal.difficulty) || 4);
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

  return (
    <div
      className="w-full rounded-xl border bg-[var(--bg-subtle)] px-3 py-2.5 space-y-2"
      style={{ borderColor: 'var(--border-ui)' }}
      data-gdvnc-human="1"
    >
      {TURNSTILE_SITE_KEY ? <div ref={widgetRef} className="flex justify-center" /> : null}
      {status === 'ok' ? (
        <div className="flex items-center justify-center text-xs font-bold min-h-8" style={{ color: 'var(--badge-green-text)' }}>
          <ShieldCheck className="w-4 h-4 mr-1.5" /> {t('auth.captcha_success')}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            ensureTurnstile();
            void run();
          }}
          disabled={status === 'working'}
          className="w-full min-h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          style={{ color: 'var(--text-title)' }}
        >
          {status === 'working' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t('auth.captcha_checking')}
            </>
          ) : status === 'fail' ? (
            t('auth.captcha_fail')
          ) : (
            t('auth.captcha_instruction')
          )}
        </button>
      )}
    </div>
  );
}
