'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Users, ChevronLeft } from 'lucide-react';
import { WORLD_COASTLINES } from '@/lib/worldGeoData';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';

interface LeaderboardClockBannerProps {
  currentUser?: any;
  onStartTransition?: () => void;
}

export function LeaderboardClockBanner({
  currentUser,
  onStartTransition,
}: LeaderboardClockBannerProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const isEn = language === 'en';

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [startRect, setStartRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const portalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(106.0); // Bắt đầu ở kinh độ Việt Nam
  const isTransitioningRef = useRef<boolean>(false);
  const transitionStartRef = useRef<number>(0);
  const startRotRef = useRef<number>(106.0);

  // Mount detection & Preload /map
  useEffect(() => {
    setMounted(true);
    router.prefetch('/map');
  }, [router]);

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lấy số người online định kỳ 15s
  useEffect(() => {
    const fetchOnline = () => {
      fetch('/api/online')
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.onlineUsers === 'number') {
            setOnlineCount(data.onlineUsers);
          }
        })
        .catch(() => {});
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 15_000);
    return () => clearInterval(interval);
  }, []);

  // 5 mốc câu chào theo khung giờ trong ngày
  const greeting = useMemo(() => {
    if (!currentTime) return '';
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 11) {
      return isEn ? 'Have a wonderful morning!' : 'Sáng vui vẻ nhaaaa!!!';
    }
    if (hour >= 11 && hour < 14) {
      return isEn
        ? 'Tired yet? Want some rest? (˶o𐃷˂˶)'
        : 'Mệt hongg? Cho gối đù-... À hong có j (˶o𐃷˂˶)';
    }
    if (hour >= 14 && hour < 18) {
      return isEn ? 'Have a pleasant afternoon ♡' : 'Chiều vv nha chủ nhân ♡';
    }
    if (hour >= 18 && hour < 22) {
      return isEn ? 'Anything fun to watch tonight?' : 'Tối nay có j xem hong taaa';
    }
    return isEn ? 'Remember to sleep early!' : 'Nhớ ngủ sớm nhaaa!';
  }, [currentTime, isEn]);

  // Chuỗi thứ ngày tháng
  const dateString = useMemo(() => {
    if (!currentTime) return '';
    return currentTime.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime, isEn]);

  // Chuỗi giờ:phút:giây
  const timeString = useMemo(() => {
    if (!currentTime) return '--:--:--';
    return currentTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }, [currentTime]);

  // Vị trí người dùng
  const userLocation = currentUser?.country || (isEn ? 'Not set' : 'Chưa đặt');

  // Xử lý hiệu ứng click chuyển sang /map
  const handleClickBanner = () => {
    if (isTransitioning) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setStartRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    startRotRef.current = rotationRef.current;
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    transitionStartRef.current = performance.now();

    // Lưu trạng thái handoff sang sessionStorage để /map khớp tọa độ đích liền mạch
    try {
      sessionStorage.setItem('gdvn_map_handoff', JSON.stringify({
        lon: 107.5,
        lat: 16.0,
        zoom: 1.1,
        timestamp: Date.now()
      }));
    } catch {}

    if (onStartTransition) {
      onStartTransition();
    }

    // Next frame: kích hoạt mở rộng full box ra toàn màn hình
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExpanded(true);
      });
    });

    // Sau khi quả địa cầu xoay và zoom khớp chuẩn (820ms), chuyển trang
    setTimeout(() => {
      router.push('/map');
    }, 820);
  };

  // Vòng lặp render Canvas Quả Địa Cầu 3D trong Banner thường (idle)
  useEffect(() => {
    if (isTransitioning) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let themeAccent = '#38bdf8';
      let themeBorder = 'rgba(56, 189, 248, 0.4)';
      try {
        const computed = getComputedStyle(document.documentElement);
        const a = computed.getPropertyValue('--accent').trim();
        const b = computed.getPropertyValue('--border-ui').trim();
        if (a) themeAccent = a;
        if (b) themeBorder = b;
      } catch {}

      const centerX = width * 0.72;
      const centerY = height * 0.95;
      const baseRadius = height * 0.85;

      rotationRef.current -= 0.18;
      if (rotationRef.current < -180) rotationRef.current += 360;
      const centerLon = rotationRef.current;
      const centerLat = 15.0;

      // 1. Viền quả cầu
      ctx.strokeStyle = themeBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Lưới kinh tuyến & vĩ tuyến
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;

      for (let lat = -75; lat <= 75; lat += 15) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      for (let lon = -180; lon <= 180; lon += 15) {
        ctx.beginPath();
        let started = false;
        for (let lat = -85; lat <= 85; lat += 4) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 3. Đường bờ biển thế giới
      ctx.strokeStyle = themeAccent;
      ctx.lineWidth = 1.8;

      for (const line of WORLD_COASTLINES) {
        ctx.beginPath();
        let started = false;
        for (const [lon, lat] of line) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isDark, theme, isTransitioning]);

  // Vòng lặp render Canvas Quả Địa Cầu 3D trong Portal Mở Rộng Toàn Màn Hình (Cinematic FLIP)
  useEffect(() => {
    if (!isTransitioning) return;
    let animId: number;

    const renderTransition = (now: number) => {
      const canvas = portalCanvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderTransition);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      let themeAccent = '#38bdf8';
      let themeBorder = 'rgba(56, 189, 248, 0.4)';
      try {
        const computed = getComputedStyle(document.documentElement);
        const a = computed.getPropertyValue('--accent').trim();
        const b = computed.getPropertyValue('--border-ui').trim();
        if (a) themeAccent = a;
        if (b) themeBorder = b;
      } catch {}

      const elapsed = now - transitionStartRef.current;
      const duration = 800; // ms
      const progress = Math.min(1, elapsed / duration);
      // Easing cubic-out
      const ease = 1 - Math.pow(1 - progress, 3);

      const sRect = startRect || { width: 900, height: 170 };
      const startCenterX = sRect.width * 0.72;
      const startCenterY = sRect.height * 0.95;
      const startRadius = sRect.height * 0.85;

      const targetCenterX = width * 0.5;
      const targetCenterY = height * 0.5;
      const targetRadius = Math.min(width, height) * 4.9;

      const centerX = startCenterX + (targetCenterX - startCenterX) * ease;
      const centerY = startCenterY + (targetCenterY - startCenterY) * ease;
      const baseRadius = startRadius + (targetRadius - startRadius) * ease;

      const targetLon = 107.5;
      const targetLat = 16.0;
      let startLon = startRotRef.current;
      let dLon = targetLon - startLon;
      while (dLon > 180) dLon -= 360;
      while (dLon < -180) dLon += 360;

      const centerLon = startLon + dLon * ease;
      const centerLat = 15.0 + (targetLat - 15.0) * ease;

      // 1. Viền quả cầu
      ctx.strokeStyle = themeBorder;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Lưới kinh tuyến & vĩ tuyến (mờ dần khi phóng to)
      const gridAlpha = Math.max(0.04, (1 - ease * 0.65) * 0.14);
      ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${gridAlpha})` : `rgba(0, 0, 0, ${gridAlpha})`;
      ctx.lineWidth = 1;

      for (let lat = -75; lat <= 75; lat += 15) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      for (let lon = -180; lon <= 180; lon += 15) {
        ctx.beginPath();
        let started = false;
        for (let lat = -85; lat <= 85; lat += 4) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 3. Đường bờ biển thế giới
      ctx.strokeStyle = themeAccent;
      ctx.lineWidth = 2.2 + ease * 0.8;

      for (const line of WORLD_COASTLINES) {
        ctx.beginPath();
        let started = false;
        for (const [lon, lat] of line) {
          const pt = project3D(lon, lat, centerLon, centerLat, baseRadius, centerX, centerY);
          if (pt) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(renderTransition);
    };

    animId = requestAnimationFrame(renderTransition);
    return () => cancelAnimationFrame(animId);
  }, [isTransitioning, isDark, theme, startRect]);

  // Phép chiếu hình cầu trực giao 3D (3D Orthographic Projection)
  function project3D(
    lonDeg: number,
    latDeg: number,
    centerLonDeg: number,
    centerLatDeg: number,
    radius: number,
    cx: number,
    cy: number
  ): { x: number; y: number } | null {
    const toRad = Math.PI / 180;
    const lambda = lonDeg * toRad;
    const phi = latDeg * toRad;
    const lambda0 = centerLonDeg * toRad;
    const phi0 = centerLatDeg * toRad;

    const cosC =
      Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

    if (cosC < 0) return null;

    const x = radius * Math.cos(phi) * Math.sin(lambda - lambda0);
    const y =
      -radius *
      (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

    return { x: cx + x, y: cy + y };
  }

  return (
    <>
      {/* 1. Static Banner trong layout thường */}
      <div
        ref={containerRef}
        onClick={handleClickBanner}
        className={`group relative w-full overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all duration-500 cursor-pointer select-none shadow-xl min-h-[170px] ${
          isTransitioning
            ? 'opacity-0 pointer-events-none'
            : 'hover:shadow-2xl hover:border-accent/60 opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
        title="Bấm để khám phá Bản Đồ Việt Nam 3D"
      >
        {/* Background canvas chứa quả địa cầu 3D */}
        <div className="absolute inset-0 pointer-events-none opacity-90 sm:opacity-95">
          <canvas
            ref={canvasRef}
            width={900}
            height={380}
            className="w-full h-full object-cover sm:object-contain object-right"
          />
        </div>

        {/* Lớp nội dung thông tin bên trái */}
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-xs"
                style={{ color: 'var(--text-title)' }}
              >
                {timeString}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold capitalize ui-dim">
              {dateString}
            </p>
          </div>

          <div
            className="text-xs sm:text-sm font-bold leading-snug tracking-wide"
            style={{ color: 'var(--text-title)' }}
          >
            {greeting}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] sm:text-xs">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium shadow-xs"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-body)',
              }}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="ui-dim">{isEn ? 'Location:' : 'Vị trí:'}</span>
              <span
                className="font-bold max-w-[140px] sm:max-w-[180px] truncate"
                style={{ color: 'var(--text-title)' }}
              >
                {userLocation}
              </span>
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold shadow-xs"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-body)',
              }}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono font-bold" style={{ color: 'var(--text-title)' }}>
                {onlineCount}
              </span>
              <span className="text-[10px] ui-dim">{isEn ? 'online' : 'đang online'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Full-Screen Cinematic Portal Transition Overlay */}
      {isTransitioning && mounted && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none select-none overflow-hidden transition-all duration-[750ms] cubic-bezier(0.16, 1, 0.3, 1)"
          style={{
            top: expanded
              ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? '0px' : '3.5rem')
              : `${startRect?.top ?? 0}px`,
            left: expanded
              ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? '16rem' : '0px')
              : `${startRect?.left ?? 0}px`,
            width: expanded
              ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? 'calc(100vw - 16rem)' : '100vw')
              : `${startRect?.width ?? 900}px`,
            height: expanded
              ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? '100vh' : 'calc(100vh - 3.5rem)')
              : `${startRect?.height ?? 170}px`,
            borderRadius: expanded ? '0px' : '1.5rem',
            backgroundColor: expanded ? '#020617' : 'var(--bg-card)',
            borderColor: expanded ? 'transparent' : 'var(--border-ui)',
            borderWidth: expanded ? '0px' : '1px',
          }}
        >
          {/* Canvas Quả Địa Cầu Phóng To Toàn Màn Hình Không Bị Giới Hạn Bởi Box */}
          <canvas
            ref={portalCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Thẻ Đồng Hồ Trượt Lên Góc Trên Bên Trái Khớp Chính Xác Với /map */}
          <div
            className="absolute pointer-events-none transition-all duration-[700ms] cubic-bezier(0.16, 1, 0.3, 1)"
            style={{
              top: expanded ? '1rem' : '1.25rem',
              left: expanded ? '1rem' : '1.25rem',
              width: expanded ? '340px' : '520px',
              maxWidth: 'calc(100% - 2rem)',
            }}
          >
            <div
              className={`border transition-all duration-500 flex flex-col gap-1.5 ${
                expanded
                  ? 'rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl'
                  : 'rounded-2xl p-4 border-transparent shadow-none'
              }`}
              style={{
                backgroundColor: expanded ? 'var(--bg-card)' : 'transparent',
                borderColor: expanded ? 'var(--border-ui)' : 'transparent',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Nút quay lại ChevronLeft xuất hiện mượt mà ở góc trên card */}
                <div
                  className={`flex items-center justify-center rounded-xl border transition-all duration-500 ${
                    expanded
                      ? 'w-8 h-8 opacity-100 scale-100'
                      : 'w-0 h-0 opacity-0 scale-75 overflow-hidden'
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                </div>

                <span
                  className={`font-mono font-black tracking-tight transition-all duration-500 ${
                    expanded ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'
                  }`}
                  style={{ color: 'var(--text-title)' }}
                >
                  {timeString}
                </span>
              </div>

              {/* Câu chào */}
              <div
                className={`font-bold leading-snug transition-all duration-500 ${
                  expanded ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
                style={{ color: 'var(--text-title)' }}
              >
                {greeting}
              </div>

              {/* Thứ ngày tháng */}
              <p className="text-[10px] font-semibold capitalize ui-dim">
                {dateString}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-body)',
                  }}
                >
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate max-w-[120px]">{userLocation}</span>
                </div>

                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-semibold shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-body)',
                  }}
                >
                  <Users className="w-3 h-3 text-emerald-500" />
                  <span className="font-mono">{onlineCount}</span>
                  <span className="text-[10px] ui-dim">{isEn ? 'online' : 'đang online'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
