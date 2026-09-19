'use client';

import React, { useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const POW_TIMEOUT_MS = 75_000;
const POW_MAX_ITERS = 16_000_000;

const POW_WORKER_SRC = `
self.onmessage = async (e) => {
  const seed = e.data.seed;
  const difficulty = e.data.difficulty;
  const maxIters = e.data.maxIters || 16000000;
  const prefix = '0'.repeat(difficulty);
  const enc = new TextEncoder();
  for (let n = 0; n < maxIters; n++) {
    const nonce = n.toString(36);
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(seed + ':' + nonce));
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < 4; i++) hex += bytes[i].toString(16).padStart(2, '0');
    if (hex.startsWith(prefix)) {
      self.postMessage({ nonce: nonce });
      return;
    }
  }
  self.postMessage({ error: true });
};
`;

function hexPrefix(buf: ArrayBuffer, difficulty: number): boolean {
  const bytes = new Uint8Array(buf);
  let hex = '';
  const need = Math.ceil(difficulty / 2) + 1;
  for (let i = 0; i < need && i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.startsWith('0'.repeat(difficulty));
}

async function solvePowMain(seed: string, difficulty: number, signal: AbortSignal): Promise<string> {
  const enc = new TextEncoder();
  for (let n = 0; n < POW_MAX_ITERS; n++) {
    if (signal.aborted) throw new Error('timeout');
    if (n > 0 && n % 400 === 0) await new Promise((r) => setTimeout(r, 0));
    const nonce = n.toString(36);
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${seed}:${nonce}`));
    if (hexPrefix(buf, difficulty)) return nonce;
  }
  throw new Error('pow');
}

function solvePowInWorker(seed: string, difficulty: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let url = '';
    let worker: Worker | null = null;
    const timer = setTimeout(() => {
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      reject(new Error('timeout'));
    }, POW_TIMEOUT_MS);
    const finish = (err?: Error, nonce?: string) => {
      clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      if (nonce) resolve(nonce);
      else reject(err || new Error('pow'));
    };
    try {
      const blob = new Blob([POW_WORKER_SRC], { type: 'text/javascript' });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = (ev) => {
        if (ev.data?.nonce) finish(undefined, String(ev.data.nonce));
        else finish(new Error('pow'));
      };
      worker.onerror = () => finish(new Error('worker'));
      worker.postMessage({ seed, difficulty, maxIters: POW_MAX_ITERS });
    } catch {
      finish(new Error('worker'));
    }
  });
}

async function solvePow(seed: string, difficulty: number): Promise<string> {
  try {
    return await solvePowInWorker(seed, difficulty);
  } catch (err) {
    if ((err as Error)?.message === 'timeout') throw err;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), POW_TIMEOUT_MS);
    try {
      return await solvePowMain(seed, difficulty, ctrl.signal);
    } finally {
      clearTimeout(timer);
    }
  }
}

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'working' | 'ok' | 'fail'>('idle');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const turnstileTokenRef = useRef('');
  const turnstileReady = useRef(false);
  const onVerifyRef = useRef(onVerify);
  const running = useRef(false);
  onVerifyRef.current = onVerify;

  const ensureTurnstile = (): Promise<string> => {
    if (!TURNSTILE_SITE_KEY) return Promise.resolve('');
    if (turnstileTokenRef.current) return Promise.resolve(turnstileTokenRef.current);

    return new Promise((resolve) => {
      const done = (token: string) => resolve(token || '');
      const timer = window.setTimeout(() => done(turnstileTokenRef.current), 30_000);
      const boot = () => {
        const ts = (window as any).turnstile;
        if (!ts || !widgetRef.current) {
          clearTimeout(timer);
          done('');
          return;
        }
        if (widgetId.current != null) {
          clearTimeout(timer);
          done(ts.getResponse(widgetId.current) || '');
          return;
        }
        widgetId.current = ts.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'flexible',
          callback: (token: string) => {
            turnstileTokenRef.current = token || '';
            clearTimeout(timer);
            done(turnstileTokenRef.current);
          },
          'expired-callback': () => {
            turnstileTokenRef.current = '';
          },
          'error-callback': () => {
            turnstileTokenRef.current = '';
            clearTimeout(timer);
            done('');
          },
        });
        turnstileReady.current = true;
      };
      if ((window as any).turnstile) {
        boot();
        return;
      }
      const existing = document.querySelector('script[data-gdvnc-turnstile]');
      if (existing) {
        existing.addEventListener('load', boot, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.gdvncTurnstile = '1';
      script.onload = boot;
      script.onerror = () => {
        clearTimeout(timer);
        done('');
      };
      document.head.appendChild(script);
    });
  };

  const run = async () => {
    if (running.current || status === 'working' || status === 'ok') return;
    running.current = true;
    setStatus('working');
    try {
      const chalRes = await fetch('/api/auth/captcha', { cache: 'no-store' });
      const chal = await chalRes.json();
      if (!chalRes.ok || !chal.success || !chal.seed) throw new Error('challenge');

      let turnstileToken = '';
      if (TURNSTILE_SITE_KEY || chal.turnstileRequired) {
        turnstileToken = await ensureTurnstile();
        if (chal.turnstileRequired && !turnstileToken) throw new Error('turnstile');
      }

      const nonce = await solvePow(chal.seed, Number(chal.difficulty) || 4);
      const res = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ seed: chal.seed, nonce, turnstileToken }),
      });
      const data = await res.json();
      if (!data.success || !data.token) throw new Error('verify');
      setStatus('ok');
      onVerifyRef.current(data.token);
    } catch {
      setStatus('fail');
    } finally {
      running.current = false;
    }
  };

  return (
    <div
      className="w-full rounded-xl border bg-[var(--bg-subtle)] px-3 py-2.5 space-y-2"
      style={{ borderColor: 'var(--border-ui)' }}
      data-gdvnc-human="1"
    >
      {TURNSTILE_SITE_KEY ? <div ref={widgetRef} className="flex justify-center min-h-[65px]" /> : null}
      {status === 'ok' ? (
        <div className="flex items-center justify-center text-xs font-bold min-h-11" style={{ color: 'var(--badge-green-text)' }}>
          <ShieldCheck className="w-4 h-4 mr-1.5" /> {t('auth.captcha_success')}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            void run();
          }}
          disabled={status === 'working'}
          className="w-full min-h-11 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 select-none"
          style={{ color: 'var(--text-title)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
