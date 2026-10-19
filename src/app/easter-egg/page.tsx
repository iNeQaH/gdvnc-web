'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
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

export default function EasterEggPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [spins, setSpins] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [userSp, setUserSp] = useState(0);
  const [nextSlotAt, setNextSlotAt] = useState<string | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showConfirmCheck, setShowConfirmCheck] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/easter-egg', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        router.replace('/');
        return;
      }
      if (!res.ok) {
        router.replace('/');
        return;
      }
      const data = await res.json();
      if (data.completed) {
        router.replace('/');
        return;
      }
      setPoints(typeof data.points === 'number' ? data.points : 0);
      setSpins(typeof data.spins === 'number' ? data.spins : 0);
      setDailyCount(typeof data.dailyCount === 'number' ? data.dailyCount : 0);
      setUserSp(typeof data.userSp === 'number' ? data.userSp : 0);
      setNextSlotAt(data.nextSlotAt || null);
      setLoaded(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    void fetchState();
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [fetchState]);

  // Synchronized system even-hour regeneration check
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (!spinning) {
        if (!nextSlotAt || Date.now() >= new Date(nextSlotAt).getTime()) {
          void fetchState();
        }
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [loaded, spinning, nextSlotAt, fetchState]);

  const handleSpin = async () => {
    if (spinning || spins <= 0) return;
    setSpinning(true);
    setShowConfirmCheck(false);

    try {
      const res = await fetch('/api/easter-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spin' }),
      });

      if (res.status === 403) {
        router.replace('/');
        return;
      }
      if (!res.ok) {
        setSpinning(false);
        return;
      }

      const data = await res.json();
      const sliceIndex = typeof data.sliceIndex === 'number' ? data.sliceIndex : 0;

      // Immediately deduct 1 spin visually when wheel starts spinning
      setSpins((prev) => Math.max(0, prev - 1));

      // Each slice is 60 deg. Slice i center is at i * 60 + 30 deg clockwise from top (0 deg).
      // To bring slice i center to the top pointer (0 deg), wheel needs rotation mod 360 == (360 - (sliceIndex * 60 + 30)) % 360.
      const sliceCenterAngle = sliceIndex * 60 + 30;
      const targetMod = (360 - sliceCenterAngle) % 360;
      const jitter = (Math.random() - 0.5) * 24; // stay well inside the 60deg slice
      const currentMod = ((rotation % 360) + 360) % 360;
      let deltaAngle = targetMod - currentMod;
      if (deltaAngle <= 0) deltaAngle += 360;
      const nextRotation = rotation + 360 * 6 + deltaAngle + jitter;

      setRotation(nextRotation);

      spinTimeoutRef.current = setTimeout(async () => {
        setPoints(typeof data.points === 'number' ? data.points : points);
        setSpins(typeof data.spins === 'number' ? data.spins : spins - 1);
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
            router.replace('/');
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
    // First time in the day requires clicking the green checkmark button
    if (dailyCount === 0) {
      setShowConfirmCheck(true);
      return;
    }
    // Subsequent exchanges in the same day do not require confirmation
    void executeExchange();
  };

  if (!loaded) {
    return <div className="fixed inset-0 z-[150] bg-[#050508]" />;
  }

  const exchangeDisabled = exchanging || spinning || dailyCount >= 3 || userSp < 1;

  return (
    <div className="fixed inset-0 z-[150] bg-[#050508] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      <div className="w-full max-w-md flex flex-col items-center gap-10">
        {/* Top Row: Spin Count Box (number only) & "1 SP = 1" Prominent Button (+ green checkmark on 1st daily click) */}
        <div className="flex items-center justify-center gap-4">
          {/* Box hiện điểm (chỉ hiển thị số, không hiển thị tên) */}
          <div className="min-w-[72px] h-14 px-5 rounded-2xl bg-zinc-900/90 border-2 border-zinc-700/80 shadow-[0_0_25px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight">
              {spins}
            </span>
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
            disabled={spinning || spins <= 0}
            className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-2 bg-zinc-900 border-4 border-zinc-700/80 shadow-[0_0_60px_rgba(0,0,0,0.95)] focus:outline-none ${
              spinning || spins <= 0 ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
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
                {WHEEL_LABELS.map((label, idx) => {
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
                    <g key={label}>
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
                        fontSize="18"
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

        {/* Thanh tiến độ (100 điểm là đầy thanh, chỉ có thanh không hiện số không hiện mô tả) */}
        <div className="w-full h-5 rounded-full bg-zinc-900 border-2 border-zinc-800 overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, points))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
