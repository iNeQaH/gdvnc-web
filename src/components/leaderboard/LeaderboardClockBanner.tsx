'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Users } from 'lucide-react';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
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

    // Sau khi quả địa cầu xoay và zoom khớp chuẩn (850ms), chuyển trang
    setTimeout(() => {
      router.push('/map');
    }, 850);
  };

  // Vòng lặp render Canvas Quả Địa Cầu 3D
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

      // Đọc màu theme từ DOM
      let themeAccent = '#38bdf8';
      let themeBorder = 'rgba(56, 189, 248, 0.4)';
      let themeTitle = '#f8fafc';
      try {
        const computed = getComputedStyle(document.documentElement);
        const a = computed.getPropertyValue('--accent').trim();
        const b = computed.getPropertyValue('--border-ui').trim();
        const t = computed.getPropertyValue('--text-title').trim();
        if (a) themeAccent = a;
        if (b) themeBorder = b;
        if (t) themeTitle = t;
      } catch {}

      // Tâm quả cầu to hẳn ra: đặt tâm ở sát cạnh đáy của box để chỉ hiện nửa trên to rõ
      let centerX = width * 0.72;
      let centerY = height * 0.95; // Tâm nằm ở đáy box
      let baseRadius = height * 0.85; // Bán kính lớn
      let centerLon = rotationRef.current;
      let centerLat = 15.0; // Vĩ độ nghiêng nhẹ

      // Xử lý hiệu ứng transition khi user click
      if (isTransitioningRef.current) {
        const elapsed = now - transitionStartRef.current;
        const duration = 850; // ms
        const progress = Math.min(1, elapsed / duration);
        // Easing cubic out
        const ease = 1 - Math.pow(1 - progress, 3);

        // Dịch tâm quả cầu ra chính giữa viewport
        centerX = centerX + (width * 0.5 - centerX) * ease;
        centerY = centerY + (height * 0.5 - centerY) * ease;

        // Phóng to quả cầu khớp đúng tỷ lệ 1:1 với kích thước nước VN trên trang /map
        // Trên /map: scale = 75 * 1.1 px/độ = 82.5 px/độ
        // Kích thước tương ứng trên quả địa cầu: R_target = 82.5 * 180 / Math.PI ≈ 4727px
        const targetRadius = Math.min(width, height) * 5.2;
        baseRadius = baseRadius + (targetRadius - baseRadius) * ease;

        // Xoay tâm quả cầu chính xác tới toạ độ Việt Nam [107.5°E, 16.0°N]
        const targetLon = 107.5;
        const targetLat = 16.0;
        centerLon = centerLon + (targetLon - centerLon) * ease;
        centerLat = centerLat + (targetLat - centerLat) * ease;
      } else {
        // Trạng thái bình thường: Xoay đều sang trái (~0.18 độ mỗi frame)
        rotationRef.current -= 0.18;
        if (rotationRef.current < -180) rotationRef.current += 360;
        centerLon = rotationRef.current;
      }

      // 1. Viền khối cầu ngoài (Màu theo theme)
      ctx.strokeStyle = themeBorder;
      ctx.lineWidth = isTransitioningRef.current ? 3 : 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Hệ thống lưới kinh tuyến (meridians) và vĩ tuyến (parallels) mỗi 15 độ
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;

      // Vĩ tuyến: từ -75 độ tới +75 độ, bước 15 độ
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

      // Kinh tuyến: từ -180 độ tới 180 độ, bước 15 độ
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

      // 3. Vẽ đường biên giới các lục địa/quốc gia theo màu theme
      ctx.strokeStyle = themeAccent;
      ctx.lineWidth = isTransitioningRef.current ? 2.8 : 1.8;

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
  }, [isDark, theme]);

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
      ref={containerRef}
      onClick={handleClickBanner}
      className={`group relative w-full overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all duration-500 cursor-pointer select-none shadow-xl min-h-[170px] ${
        isTransitioning ? 'scale-[1.02] shadow-2xl z-50' : 'hover:shadow-2xl hover:border-accent/60'
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-ui)',
      }}
      title="Bấm để khám phá Bản Đồ Việt Nam 3D"
    >
      {/* Background canvas chứa quả địa cầu 3D to hẳn, chỉ lộ nửa trên */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isTransitioning ? 'opacity-100' : 'opacity-90 sm:opacity-95'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={900}
          height={380}
          className="w-full h-full object-cover sm:object-contain object-right"
        />
      </div>

      {/* Lớp nội dung thông tin bên trái */}
      <div
        className={`relative z-10 max-w-xl space-y-3 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Hàng 1: Đồng hồ số to rõ theo màu theme + Thứ ngày tháng */}
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

        {/* Hàng 2: Câu chào cùng màu với đồng hồ (theo màu theme) - Không icon ngôi sao */}
        <div
          className="text-xs sm:text-sm font-bold leading-snug tracking-wide"
          style={{ color: 'var(--text-title)' }}
        >
          {greeting}
        </div>

        {/* Hàng 3: Vị trí người dùng & Số người đang Online */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] sm:text-xs">
          {/* Badge Vị trí */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium shadow-xs"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-body)'
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

          {/* Badge Số người Online */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold shadow-xs"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-body)'
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
  );
}
