'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Loader2, ChevronRight, Fingerprint } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SmartCaptchaProps {
  onVerify: (token: string) => void;
}

export default function SmartCaptcha({ onVerify }: SmartCaptchaProps) {
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [holdTime, setHoldTime] = useState(0); 
  const [targetPos, setTargetPos] = useState(0.6);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const trajectory = useRef<{ x: number; y: number; t: number }[]>([]);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);

  const isVerifiedRef = useRef(isVerified);
  const isVerifyingRef = useRef(isVerifying);
  useEffect(() => { isVerifiedRef.current = isVerified; }, [isVerified]);
  useEffect(() => { isVerifyingRef.current = isVerifying; }, [isVerifying]);

  useEffect(() => {
    setTargetPos(0.3 + Math.random() * 0.5); // 30% to 80%
  }, []);

  const inZone = Math.abs(progress - targetPos) < 0.08;

  useEffect(() => {
    if (isVerified || isVerifying) return;

    if (inZone) {
      if (!holdInterval.current) {
        holdInterval.current = setInterval(() => {
          setHoldTime((prev) => {
            const next = prev + 50;
            if (next >= 3000) {
              clearInterval(holdInterval.current!);
              holdInterval.current = null;
              verifyTrajectory();
              return 3000;
            }
            return next;
          });
        }, 50);
      }
    } else {
      if (holdInterval.current) {
        clearInterval(holdInterval.current);
        holdInterval.current = null;
      }
      setHoldTime(0);
    }

    return () => {
      if (holdInterval.current) {
        clearInterval(holdInterval.current);
        holdInterval.current = null;
      }
    };
  }, [inZone, isVerified, isVerifying, progress]);

  const verifyTrajectory = async () => {
    if (isVerifyingRef.current || isVerifiedRef.current) return;
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trajectory: trajectory.current })
      });
      const data = await res.json();
      if (data.success) {
        setIsVerified(true);
        onVerify(data.token);
      } else {
        setProgress(0);
        setHoldTime(0);
      }
    } catch (e) {
      setProgress(0);
      setHoldTime(0);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isVerifiedRef.current || isVerifyingRef.current) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    trajectory.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    
    const handleMove = (ev: PointerEvent) => {
      if (isVerifiedRef.current || isVerifyingRef.current) return;
      trajectory.current.push({ x: ev.clientX, y: ev.clientY, t: Date.now() });
      if (sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const maxScroll = rect.width - 8 - 40; 
        const currentScroll = ev.clientX - rect.left - 24;
        const rawProgress = currentScroll / maxScroll;
        setProgress(Math.max(0, Math.min(1, rawProgress)));
      }
    };
    
    const handleUp = async (ev: PointerEvent) => {
      trajectory.current.push({ x: ev.clientX, y: ev.clientY, t: Date.now() });
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      
      if (!isVerifiedRef.current && !isVerifyingRef.current) {
        setProgress(0);
        setHoldTime(0);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const buttonGlow = inZone ? 'shadow-[0_0_15px_rgba(56,189,248,0.6)]' : 'shadow-sm';

  return (
    <div 
      className="w-full h-12 rounded-xl relative overflow-hidden select-none touch-none border bg-[var(--bg-subtle)]"
      style={{ borderColor: 'var(--border-ui)' }}
      ref={sliderRef}
    >
      <div 
        className="absolute top-0 bottom-0 left-0 transition-none"
        style={{ 
          width: `${progress * 100}%`,
          backgroundColor: inZone ? 'rgba(56,189,248,0.2)' : 'var(--accent)',
          opacity: inZone ? 1 : 0.1
        }}
      />
      
      {!isVerified && !isVerifying && (
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${inZone ? 'bg-sky-400 scale-[2.5] shadow-[0_0_10px_rgba(56,189,248,1)]' : 'bg-sky-500/50'}`}
          style={{ left: `calc(24px + ${targetPos} * (100% - 48px))` }}
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold z-0 pointer-events-none">
        {isVerified ? (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--badge-green-text)' }}>
            <ShieldCheck className="w-4 h-4" /> {t('auth.captcha_success')}
          </span>
        ) : isVerifying ? (
          <span className="flex items-center gap-1.5 ui-dim">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('auth.captcha_checking')}
          </span>
        ) : (
          <span className="ui-dim opacity-70">
            {t('auth.captcha_instruction')}
          </span>
        )}
      </div>
      
      {!isVerified && !isVerifying && (
        <div 
          className={`absolute top-1 bottom-1 w-10 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing border z-10 transition-colors bg-[var(--bg-card)] ${buttonGlow}`}
          style={{ 
            left: `calc(4px + ${progress} * (100% - 48px))`,
            borderColor: inZone ? 'transparent' : 'var(--border-ui)',
            color: inZone ? '#38bdf8' : 'var(--text-title)'
          }}
          onPointerDown={handlePointerDown}
        >
          {inZone ? (
             <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
               <Fingerprint className="w-5 h-5 animate-pulse text-sky-400" />
               <div className="absolute bottom-0 left-0 h-1 bg-sky-400 transition-none" style={{ width: `${(holdTime / 3000) * 100}%` }} />
             </div>
          ) : (
            <ChevronRight className="w-4 h-4 ui-dim" />
          )}
        </div>
      )}
    </div>
  );
}
