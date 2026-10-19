'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { refreshSessionUser } from '@/lib/sessionClient';

const WHEEL_LABELS = ['-1', '-2', '0', '+1', '+2', '+3'] as const;
const WHEEL_COLORS = [
  '#ef4444', // -1
  '#b91c1c', // -2
  '#334155', // 0
  '#0ea5e9', // +1
  '#8b5cf6', // +2
  '#10b981', // +3
];

interface EasterEggOverlayProps {
  onClose: () => void;
}

export function EasterEggOverlay({ onClose }: EasterEggOverlayProps) {
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [spins, setSpins] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [userSp, setUserSp] = useState(0);
  const [nextSlotAt, setNextSlotAt] = useState<string | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>('00:00:00');
  const [isTester, setIsTester] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [all100Mode, setAll100Mode] = useState(false);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showConfirmCheck, setShowConfirmCheck] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/easter-egg', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        onClose();
        return;
      }
      if (!res.ok) {
        onClose();
        return;
      }
      const data = await res.json();
      if (data.completed && !data.isOwner && !data.isTester) {
        onClose();
        return;
      }
      setPoints(typeof data.points === 'number' ? data.points : 0);
      setSpins(typeof data.spins === 'number' ? data.spins : 0);
      setDailyCount(typeof data.dailyCount === 'number' ? data.dailyCount : 0);
      setUserSp(typeof data.userSp === 'number' ? data.userSp : 0);
      setNextSlotAt(data.nextSlotAt || null);
      setIsTester(Boolean(data.isTester));
      setIsOwner(Boolean(data.isOwner));
      setLoaded(true);
    } catch {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    void fetchState();
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [fetchState]);

  // Synchronized countdown for natural regeneration (next even hour)
  useEffect(() => {
    if (!nextSlotAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextSlotAt).getTime();
      const diff = Math.max(0, target - now);

      if (diff <= 0) {
        setCountdownStr('00:00:00');
        if (!spinning) {
          void fetchState();
        }
        return;
      }

      const h = Math.floor(diff / 3600_000);
      const m = Math.floor((diff % 3600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdownStr(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSlotAt, spinning, fetchState]);

  const handleResetPoints = async () => {
    if ((!isOwner && !isTester) || spinning) return;
    try {
      const res = await fetch('/api/easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        setPoints(0);
        setSpins(9999);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSpin = async () => {
    if (spinning || (!isOwner && !isTester && spins <= 0)) return;
    setSpinning(true);
    setShowConfirmCheck(false);

    try {
      const res = await fetch('/api/easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spin', force100: isOwner && all100Mode }),
      });

      if (res.status === 403 && !isOwner) {
        onClose();
        return;
      }
      if (!res.ok) {
        setSpinning(false);
        return;
      }

      const data = await res.json();
      const sliceIndex = typeof data.sliceIndex === 'number' ? data.sliceIndex : 0;

      // Immediately deduct 1 spin visually (owner & testers stay at 9999)
      setSpins((prev) => (isOwner || isTester ? 9999 : Math.max(0, prev - 1)));

      const sliceCenterAngle = sliceIndex * 60 + 30;
      const targetMod = (360 - sliceCenterAngle) % 360;
      const jitter = (Math.random() - 0.5) * 24;
      const currentMod = ((rotation % 360) + 360) % 360;
      let deltaAngle = targetMod - currentMod;
      if (deltaAngle <= 0) deltaAngle += 360;
      const nextRotation = rotation + 360 * 6 + deltaAngle + jitter;

      setRotation(nextRotation);

      spinTimeoutRef.current = setTimeout(async () => {
        setPoints(typeof data.points === 'number' ? data.points : points);
        setSpins(typeof data.spins === 'number' ? (isOwner || isTester ? 9999 : data.spins) : spins);
        setSpinning(false);

        if (data.completed || data.points >= 100) {
          try {
            const raw = localStorage.getItem('gdvnc_user');
            if (raw) {
              const parsed = JSON.parse(raw);
              localStorage.setItem(
                'gdvnc_user',
                JSON.stringify({ ...parsed, easterEggCompleted: true })
              );
            }
          } catch {
            /* ignore */
          }
          await refreshSessionUser();
          setTimeout(() => {
            onClose();
          }, 900);
        }
      }, 3600);
    } catch {
      setSpinning(false);
    }
  };

  const executeExchange = async () => {
    if (exchanging || dailyCount >= 3 || userSp < 1) return;
    setExchanging(true);
    setShowConfirmCheck(false);
    try {
      const res = await fetch('/api/easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange' }),
      });
      if (!res.ok) {
        setExchanging(false);
        return;
      }
      const data = await res.json();
      setSpins(typeof data.spins === 'number' ? data.spins : spins + 1);
      setDailyCount(typeof data.dailyCount === 'number' ? data.dailyCount : dailyCount + 1);
      setUserSp(typeof data.userSp === 'number' ? data.userSp : Math.max(0, userSp - 1));
      void refreshSessionUser();
    } finally {
      setExchanging(false);
    }
  };

  const handleClickExchangeButton = () => {
    if (exchanging || spinning || dailyCount >= 3 || userSp < 1) return;
    if (dailyCount === 0) {
      setShowConfirmCheck(true);
      return;
    }
    void executeExchange();
  };

  if (!loaded) {
    return <div className="fixed inset-0 z-[999999] bg-[#050508]" />;
  }

  const exchangeDisabled = exchanging || spinning || dailyCount >= 3 || userSp < 1;
  const displayedLabels = isOwner && all100Mode
    ? ['+100', '+100', '+100', '+100', '+100', '+100']
    : WHEEL_LABELS;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#050508] flex flex-col items-center justify-center p-6 select-none overflow-hidden animate-in fade-in duration-300">
      {/* Top Left: Owner ALL +100 Toggle Button */}
      {isOwner && (
        <button
          type="button"
          onClick={() => setAll100Mode((prev) => !prev)}
          className={`absolute top-6 left-6 sm:top-8 sm:left-8 z-30 px-3.5 py-2 rounded-2xl border font-black text-xs tracking-wider transition-all cursor-pointer backdrop-blur-md select-none ${
            all100Mode
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-yellow-200 shadow-[0_0_25px_rgba(245,158,11,0.7)] scale-105'
              : 'bg-zinc-900/90 text-amber-400 border-amber-500/40 hover:border-amber-300 hover:bg-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
          }`}
          title="Chế độ Owner: Biến tất cả ô thành +100"
        >
          {all100Mode ? '⚡ ALL +100' : '+100'}
        </button>
      )}

      {/* Top Right: SP Coin Balance Box */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-2 backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
        <span className="text-base font-black text-amber-300 tabular-nums tracking-tight">
          {userSp}
        </span>
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-10">
        {/* Top Row: Spin Count Box & "1 SP = 1" Prominent Button */}
        <div className="flex items-center justify-center gap-4">
          {/* Relative wrapper for Spin Box + Countdown Box on top */}
          <div className="relative flex flex-col items-center">
            {/* Box đếm ngược hồi điểm trên đầu khi chưa đầy (đặc biệt khi spins === 0) */}
            {spins < 3 && nextSlotAt && !isOwner && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-zinc-900/95 border border-zinc-700/80 shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center whitespace-nowrap z-20">
                <span className="text-[11px] font-mono font-bold text-zinc-300 tabular-nums tracking-wider">
                  {countdownStr}
                </span>
              </div>
            )}

            {/* Box hiện điểm (chỉ hiển thị số, không hiển thị tên) */}
            <div className="min-w-[72px] h-14 px-5 rounded-2xl bg-zinc-900/90 border-2 border-zinc-700/80 shadow-[0_0_25px_rgba(0,0,0,0.8)] flex items-center justify-center">
              <span className="text-2xl font-black text-white tabular-nums tracking-tight">
                {isOwner ? '∞' : spins}
              </span>
            </div>
          </div>

          {/* Nút nổi bật "1 SP = 1" */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClickExchangeButton}
              disabled={exchangeDisabled}
              className={`h-14 px-6 rounded-2xl font-black text-base tracking-wider transition-all ${
                exchangeDisabled
                  ? 'bg-zinc-900 text-zinc-600 border-2 border-zinc-800 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black border-2 border-yellow-200 shadow-[0_0_25px_rgba(245,158,11,0.55)] hover:shadow-[0_0_35px_rgba(245,158,11,0.85)] active:scale-95 cursor-pointer'
              }`}
            >
              1 SP = 1
            </button>

            {showConfirmCheck && dailyCount === 0 && !exchangeDisabled && (
              <button
                type="button"
                onClick={executeExchange}
                className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black border-2 border-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.65)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-7 h-7 stroke-[3.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Vòng xoay (-1, -2, 0, +1, +2, +3) */}
        <div className="relative flex items-center justify-center">
          {/* Top Pointer */}
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-0 h-0"
            style={{
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '24px solid #f8fafc',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))',
            }}
          />

          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || (!isOwner && !isTester && spins <= 0)}
            className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-2 bg-zinc-900 border-4 border-zinc-700/80 shadow-[0_0_60px_rgba(0,0,0,0.95)] focus:outline-none ${
              spinning || (!isOwner && !isTester && spins <= 0) ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
            }`}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? 'transform 3.5s cubic-bezier(0.12, 0.8, 0.18, 1)'
                  : 'none',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {displayedLabels.map((label, idx) => {
                  const startDeg = idx * 60 - 90;
                  const endDeg = (idx + 1) * 60 - 90;
                  const startRad = (startDeg * Math.PI) / 180;
                  const endRad = (endDeg * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(startRad);
                  const y1 = 100 + 100 * Math.sin(startRad);
                  const x2 = 100 + 100 * Math.cos(endRad);
                  const y2 = 100 + 100 * Math.sin(endRad);
                  const midDeg = idx * 60 + 30 - 90;
                  const midRad = (midDeg * Math.PI) / 180;
                  const tx = 100 + 64 * Math.cos(midRad);
                  const ty = 100 + 64 * Math.sin(midRad);
                  const textRotate = idx * 60 + 30;

                  return (
                    <g key={idx}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                        fill={WHEEL_COLORS[idx]}
                        stroke="#09090b"
                        strokeWidth="2"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#ffffff"
                        fontSize={label.length > 2 ? '14' : '18'}
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${textRotate}, ${tx}, ${ty})`}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Cap */}
            <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-zinc-950 border-4 border-zinc-600 shadow-inner pointer-events-none" />
          </button>
        </div>

        {/* Thanh tiến độ (100 điểm đầy thanh, chỉ có thanh không hiện số không hiện mô tả) */}
        <div
          onDoubleClick={handleResetPoints}
          title={isTester ? 'Nhấn đúp để đặt lại điểm (Chế độ Tester)' : undefined}
          className="w-full h-5 rounded-full bg-zinc-900 border-2 border-zinc-800 overflow-hidden p-0.5 shadow-inner cursor-pointer"
        >
          <div
            className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, points))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
