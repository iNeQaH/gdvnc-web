'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Users, Sparkles } from 'lucide-react';
import { WORLD_COASTLINES, VIETNAM_COORDINATES } from '@/lib/worldGeoData';
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(106.0); // Bắt đầu ở kinh độ Việt Nam
  const isTransitioningRef = useRef<boolean>(false);
  const transitionStartRef = useRef<number>(0);

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
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    transitionStartRef.current = performance.now();

    if (onStartTransition) {
      onStartTransition();
    }

    // Sau khi quả địa cầu xoay và zoom vào Việt Nam (900ms), chuyển trang
    setTimeout(() => {
      router.push('/map');
    }, 950);
  };

  // Vòng lặp render Canvas Quả Địa Cầu 3D (Orthographic Projection)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Tham số quả địa cầu
      let baseRadius = Math.min(width, height) * 0.42;
      let centerX = width * 0.72;
      let centerY = height * 0.52;
      let centerLat = 15; // Hơi nhìn từ trên xuống để thấy nửa bán cầu bắc
      let centerLon = rotationRef.current;

      // Xử lý hoạt ảnh chuyển cảnh sang /map
      if (isTransitioningRef.current) {
        const elapsed = Math.min(now - transitionStartRef.current, 950);
        const progress = elapsed / 950;
        // Ease-in-out cubic
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Dịch tâm về giữa màn hình
        centerX = centerX + (width * 0.5 - centerX) * ease;
        centerY = centerY + (height * 0.5 - centerY) * ease;
        // Phóng to quả cầu
        baseRadius = baseRadius + (Math.min(width, height) * 1.5 - baseRadius) * ease;
        // Xoay tâm quả cầu chính xác tới toạ độ Việt Nam [106°E, 16°N]
        const targetLon = VIETNAM_COORDINATES[0];
        const targetLat = VIETNAM_COORDINATES[1];
        centerLon = centerLon + (targetLon - centerLon) * ease;
        centerLat = centerLat + (targetLat - centerLat) * ease;
      } else {
        // Trạng thái bình thường: Xoay đều sang trái (~0.25 độ mỗi frame)
        rotationRef.current -= 0.22;
        if (rotationRef.current < -180) rotationRef.current += 360;
        centerLon = rotationRef.current;
      }

      // Màu sắc theo theme
      const strokeColor = isDark ? '#38bdf8' : '#0284c7';
      const glowColor = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.25)';
      const vnBeaconColor = '#ef4444';

      // 1. Vẽ quầng sáng sau quả địa cầu
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.3,
        centerX,
        centerY,
        baseRadius * 1.15
      );
      grad.addColorStop(0, glowColor);
      grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.05)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Vẽ viền khối cầu ngoài
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Vẽ kinh tuyến và vĩ tuyến mờ
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 5) {
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

      // 4. Vẽ đường biên giới các lục địa/quốc gia
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isTransitioningRef.current ? 2.5 : 1.4;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 4;

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
      ctx.shadowBlur = 0;

      // 5. Điểm sáng định vị Việt Nam [106°E, 16°N]
      const vnPt = project3D(
        VIETNAM_COORDINATES[0],
        VIETNAM_COORDINATES[1],
        centerLon,
        centerLat,
        baseRadius,
        centerX,
        centerY
      );
      if (vnPt) {
        const pulse = 1 + Math.sin(now * 0.005) * 0.35;
        ctx.fillStyle = vnBeaconColor;
        ctx.shadowColor = vnBeaconColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(vnPt.x, vnPt.y, 4 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Vòng sóng phát xung
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(vnPt.x, vnPt.y, 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isDark]);

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

    // Khoảng cách góc cos(c)
    const cosC =
      Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

    // Chỉ vẽ các điểm thuộc bán cầu hướng về camera (cosC >= 0)
    if (cosC < 0) return null;

    const x = radius * Math.cos(phi) * Math.sin(lambda - lambda0);
    const y =
      -radius *
      (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

    return { x: cx + x, y: cy + y };
  }

  return (
    <div
      onClick={handleClickBanner}
      className={`group relative w-full overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all duration-500 cursor-pointer select-none shadow-xl ${
        isTransitioning ? 'scale-[1.03] shadow-2xl z-50' : 'hover:shadow-2xl hover:border-sky-500/50'
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-ui)',
      }}
      title="Bấm để khám phá Bản Đồ Việt Nam 3D"
    >
      {/* Background canvas chứa quả địa cầu 3D */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isTransitioning ? 'opacity-100' : 'opacity-85 sm:opacity-95'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          className="w-full h-full object-cover sm:object-contain object-right"
        />
      </div>

      {/* Lớp nội dung thông tin bên trái */}
      <div
        className={`relative z-10 max-w-xl space-y-3.5 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Hàng 1: Đồng hồ số to rõ + Thứ ngày tháng */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 drop-shadow-xs">
              {timeString}
            </span>
            <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">
            {dateString}
          </p>
        </div>

        {/* Hàng 2: Câu chào đổi theo khung giờ trong ngày */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400">
          <Sparkles className="w-4 h-4 shrink-0 animate-spin-slow text-amber-500" />
          <span className="leading-snug">{greeting}</span>
        </div>

        {/* Hàng 3: Vị trí người dùng & Số người đang Online */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] sm:text-xs">
          {/* Badge Vị trí */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="ui-dim">{isEn ? 'Location:' : 'Vị trí:'}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[140px] sm:max-w-[180px] truncate">
              {userLocation}
            </span>
          </div>

          {/* Badge Số người Online */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs">
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-bold">{onlineCount}</span>
            <span className="text-[10px] opacity-80">{isEn ? 'online' : 'đang online'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
