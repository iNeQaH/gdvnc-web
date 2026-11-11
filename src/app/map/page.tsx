'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Box,
  Layers,
  RotateCw,
  RotateCcw,
  X,
  Trophy,
  Users,
  Award,
  Star,
  Gamepad2,
  Crosshair,
  Wrench,
  Flame,
  Moon,
  Plus,
  Minus,
  MapPin,
  Clock,
  Shield,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VietnamMapCanvas } from '@/components/map/VietnamMapCanvas';
import { VIETNAM_PROVINCES_GEO } from '@/lib/vietnamGeoData';
import { extractProvinceFromLocation } from '@/lib/location';
import { formatCp } from '@/lib/creatorPoints';
import { useLanguage } from '@/components/LanguageContext';
import { refreshSessionUser } from '@/lib/sessionClient';
import { UserDisplayName } from '@/components/UserDisplayName';

const MODES = [
  'POPULATION',
  'CLASSIC',
  'PLATFORMER',
  'CHALLENGE',
  'CREATOR',
  'ACTIVITY',
  'STARS',
  'MOONS',
  'DEMONS',
] as const;

type LeaderboardMode = (typeof MODES)[number];

const MODE_LABELS: Record<LeaderboardMode, { nameVi: string; nameEn: string; icon: any }> = {
  POPULATION: { nameVi: 'Số lượng người chơi', nameEn: 'Player Count', icon: Users },
  CLASSIC: { nameVi: 'Classic', nameEn: 'Classic', icon: Star },
  PLATFORMER: { nameVi: 'Platformer', nameEn: 'Platformer', icon: Gamepad2 },
  CHALLENGE: { nameVi: 'Challenge', nameEn: 'Challenge', icon: Crosshair },
  CREATOR: { nameVi: 'Creator Points', nameEn: 'Creator Points', icon: Wrench },
  ACTIVITY: { nameVi: 'Hoạt Động Tuần', nameEn: 'Weekly Activity', icon: Flame },
  STARS: { nameVi: 'Stars', nameEn: 'Stars', icon: Star },
  MOONS: { nameVi: 'Moons', nameEn: 'Moons', icon: Moon },
  DEMONS: { nameVi: 'Demons', nameEn: 'Demons', icon: null },
};

export default function VietnamMapPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [mode, setMode] = useState<LeaderboardMode>('POPULATION');
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [is3D, setIs3D] = useState<boolean>(false);
  const [snapCounter, setSnapCounter] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [showProvinceNames, setShowProvinceNames] = useState<boolean>(false);
  const [zoomInTrigger, setZoomInTrigger] = useState<number>(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState<number>(0);
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [cameraMetrics, setCameraMetrics] = useState<{ zoom: number; yaw: number; pitch: number }>({
    zoom: 1.1,
    yaw: 0,
    pitch: 0,
  });
  const [hudReady, setHudReady] = useState<boolean>(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState<boolean>(false);
  const [isUiHidden, setIsUiHidden] = useState<boolean>(false);

  useEffect(() => {
    if (!isModeDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#mode-selector-container')) {
        setIsModeDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isModeDropdownOpen]);

  useEffect(() => {
    let hasHandoff = false;
    try {
      hasHandoff = !!sessionStorage.getItem('gdvn_map_handoff');
    } catch {}
    if (hasHandoff) {
      const timer = setTimeout(() => setHudReady(true), 250);
      return () => clearTimeout(timer);
    } else {
      setHudReady(true);
    }
  }, []);

  // Clock state
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Prevent scroll on body
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online count
  useEffect(() => {
    const fetchOnline = () => {
      fetch('/api/online')
        .then((res) => res.json())
        .then((d) => {
          if (d && typeof d.onlineUsers === 'number') {
            setOnlineCount(d.onlineUsers);
          }
        })
        .catch(() => {});
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Các mốc câu chào theo thời gian trong ngày
  const greeting = useMemo(() => {
    if (!currentTime) return '';
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();

    // 1h00 - 1h14 sáng
    if (hour === 1 && minute < 15) {
      return isEn ? 'Miss trayson so much' : 'Nho trayson nhieu lam';
    }
    // 1h15 - 1h29 sáng
    if (hour === 1 && minute >= 15 && minute < 30) {
      return isEn ? 'love trayson' : 'iu trayson';
    }
    // 1h30 - trước 6h sáng
    if ((hour === 1 && minute >= 30) || (hour >= 2 && hour < 6)) {
      return isEn ? "Don't stay up late..." : 'Đừng thức khuya nữa...';
    }
    // 6h00 - trước 11h sáng
    if (hour >= 6 && hour < 11) {
      return isEn ? 'Have a wonderful morning!' : 'Sáng vui vẻ nhaaaa!!!';
    }
    // 11h00 - trước 14h chiều
    if (hour >= 11 && hour < 14) {
      return isEn
        ? 'Tired yet? Want some rest? (˶o𐃷˂˶)'
        : 'Mệt hongg? Cho gối đù-... À hong có j (˶o𐃷˂˶)';
    }
    // 14h00 - trước 18h chiều
    if (hour >= 14 && hour < 18) {
      return isEn ? 'Have a pleasant afternoon ♡' : 'Chiều vv nha chủ nhân ♡';
    }
    // 18h00 - trước 22h tối
    if (hour >= 18 && hour < 22) {
      return isEn ? 'Anything fun to watch tonight?' : 'Tối nay có j xem hong taaa';
    }
    // 22h00 - 0h59 đêm
    return isEn ? 'Remember to sleep early!' : 'Nhớ ngủ sớm nhaaa!';
  }, [currentTime, isEn]);

  const timeString = useMemo(() => {
    if (!currentTime) return '--:--:--';
    return currentTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }, [currentTime]);

  const dateString = useMemo(() => {
    if (!currentTime) return '';
    return currentTime.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime, isEn]);

  // Load current user
  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('gdvnc_user');
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch {}
      }
    };
    loadUser();
    refreshSessionUser().then((u) => {
      if (u) setCurrentUser(u);
    });
    window.addEventListener('gdvnc_user_update', loadUser);
    return () => window.removeEventListener('gdvnc_user_update', loadUser);
  }, []);

  // Fetch map data when mode changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/map?mode=${mode}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setMapData(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode]);

  // Cycle through leaderboard modes
  const handleCycleMode = () => {
    const idx = MODES.indexOf(mode);
    const nextMode = MODES[(idx + 1) % MODES.length];
    setMode(nextMode);
  };

  // Reset button click: snaps camera to user's province, hides users & shows province names for 2 seconds
  const handleResetClick = () => {
    setSnapCounter((c) => c + 1);
    setShowProvinceNames(true);
    setTimeout(() => {
      setShowProvinceNames(false);
    }, 2000);
  };

  // Reset map overview: thu ve 2D va nhin tron ven Viet Nam
  const handleFullResetMap = () => {
    setIs3D(false);
    setSelectedProvinceId(null);
    setResetTrigger((c) => c + 1);
  };

  // Selected province details
  const selectedProvinceGeo = useMemo(() => {
    if (!selectedProvinceId) return null;
    return VIETNAM_PROVINCES_GEO.find((p) => p.id === selectedProvinceId) || null;
  }, [selectedProvinceId]);

  const selectedProvinceData = useMemo(() => {
    if (!selectedProvinceId || !mapData?.provinces) return null;
    return mapData.provinces[selectedProvinceId] || null;
  }, [selectedProvinceId, mapData]);

  // Format score based on mode
  const formatScore = (player: any) => {
    if (!player) return '';
    if (mode === 'POPULATION') {
      return '';
    }
    if (mode === 'CREATOR') {
      return `${formatCp(player.creatorPoints ?? player.score ?? 0)} CP`;
    }
    if (mode === 'STARS') {
      return `${Number(player.statValue ?? player.gdStars ?? player.score ?? 0).toLocaleString()} Stars`;
    }
    if (mode === 'MOONS') {
      return `${Number(player.statValue ?? player.gdMoons ?? player.score ?? 0).toLocaleString()} Moons`;
    }
    if (mode === 'DEMONS') {
      return `${Number(player.statValue ?? player.gdDemons ?? player.score ?? 0).toLocaleString()} Demons`;
    }
    if (mode === 'ACTIVITY') {
      return `${Number(player.activityPoints ?? player.score ?? 0).toLocaleString()} Act`;
    }
    const pts = player.score ?? (
      mode === 'PLATFORMER'
        ? player.platformerPp
        : mode === 'CHALLENGE'
        ? player.challengePp
        : player.classicPp
    );
    return `${Number(pts || 0).toFixed(2)} Pt`;
  };

  const userLocation = currentUser?.country || (isEn ? 'Not set' : 'Chưa đặt');
  const ModeIcon = MODE_LABELS[mode].icon;

  const formatYaw = (yaw: number): string => {
    const normYaw = ((yaw % 360) + 360) % 360;
    const deg = Math.floor(normYaw);
    const min = Math.floor((normYaw - deg) * 60);
    return `${deg}°${min}'`;
  };

  const hoveredProvinceData = hoveredProvinceId && mapData?.provinces
    ? mapData.provinces[hoveredProvinceId]
    : null;
  const hoveredDisplayClans = hoveredProvinceData?.clans?.slice(0, 3) || [];
  const hoveredHasMoreClans = (hoveredProvinceData?.clans?.length || 0) > 3;

  return (
    // Fixed container matching .gdvn-timeline (Fullscreen on right of Sidebar, no footer, no padding glitch)
    <div className="fixed inset-[3.5rem_0_0_0] md:inset-[0_0_0_16rem] z-20 overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Canvas Map Engine */}
      <VietnamMapCanvas
        mapData={mapData}
        selectedProvinceId={selectedProvinceId}
        onSelectProvince={(id) => setSelectedProvinceId(id)}
        onHoverProvince={setHoveredProvinceId}
        onCameraChange={setCameraMetrics}
        currentUser={currentUser}
        currentMode={mode}
        is3D={is3D}
        onToggle3D={() => setIs3D((prev) => !prev)}
        onRequestSnapToUser={snapCounter}
        onRequestFullReset={resetTrigger}
        showProvinceNamesOverlay={showProvinceNames}
        zoomInTrigger={zoomInTrigger}
        zoomOutTrigger={zoomOutTrigger}
      />

      {/* 2. Top-Left HUD: Clock Info & Leaderboard Dropdown Selector */}
      <div
        className={`absolute top-4 left-4 z-30 flex flex-col gap-2 max-w-sm pointer-events-auto transition-all duration-500 ${
          isUiHidden ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Clock Info Card */}
        <div
          className="rounded-2xl border p-3.5 backdrop-blur-xl shadow-2xl flex flex-col gap-1.5 transition-all"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: 'var(--text-title)' }}
            >
              {timeString}
            </span>
          </div>

          {/* Greeting text with theme color */}
          <div
            className="text-xs font-bold leading-snug"
            style={{ color: 'var(--text-title)' }}
          >
            {greeting}
          </div>

          <p className="text-[10px] font-semibold capitalize ui-dim">
            {dateString}
          </p>

          {/* Location & Online Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
            <div
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-body)',
              }}
            >
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate max-w-[110px]">{userLocation}</span>
            </div>

            <div
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-semibold"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-body)',
              }}
            >
              <Users className="w-3 h-3 text-emerald-500" />
              <span className="font-mono">{onlineCount}</span>
            </div>
          </div>
        </div>

        {/* Nút Dropdown Selector Leaderboard Mode ở góc trên bên trái: Click thả xuống tất cả 9 mode */}
        <div id="mode-selector-container" className="relative">
          <button
            type="button"
            onClick={() => setIsModeDropdownOpen((v) => !v)}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-700 ease-out active:scale-95 cursor-pointer group min-w-[200px] ${
              hudReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
            }}
            title={isEn ? 'Select leaderboard mode' : 'Chọn bảng xếp hạng'}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {ModeIcon ? (
                <ModeIcon className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <img
                  src="/difficulties/EXTREME DEMON.png"
                  alt="Demons"
                  className="w-4 h-4 object-contain inline-block shrink-0"
                />
              )}
              <span className="truncate text-xs font-black" style={{ color: 'var(--accent)' }}>
                {isEn ? MODE_LABELS[mode].nameEn : MODE_LABELS[mode].nameVi}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                isModeDropdownOpen ? 'rotate-180 text-sky-400' : 'ui-dim'
              }`}
            />
          </button>

          {/* Menu thả xuống tất cả các Leaderboard */}
          {isModeDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-2 z-40 flex flex-col gap-1 p-1.5 rounded-2xl border backdrop-blur-2xl shadow-2xl min-w-[230px] animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
            >
              {MODES.map((m) => {
                const info = MODE_LABELS[m];
                const Icon = info.icon;
                const isSelected = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setIsModeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-400 font-black'
                        : 'hover:bg-white/5 ui-dim hover:text-white'
                    }`}
                  >
                    {Icon ? (
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'ui-dim'}`} />
                    ) : (
                      <img
                        src="/difficulties/EXTREME DEMON.png"
                        alt="Demons"
                        className="w-4 h-4 object-contain inline-block shrink-0"
                      />
                    )}
                    <span className="truncate">
                      {isEn ? info.nameEn : info.nameVi}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Top-Right Controls: Sắp xếp theo chiều dọc (3D, La bàn, Reset Map, Tên Tỉnh "A", Zoom +, Zoom -, Toggle Ẩn UI) */}
      <div
        className={`absolute top-4 z-30 flex flex-col items-center gap-2 pointer-events-auto transition-all duration-700 ease-out ${
          selectedProvinceId ? 'right-[23.5rem]' : 'right-4'
        } ${hudReady ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}
      >
        {/* Khi UI bị ẩn: CHỈ DUY NHẤT nút này hiển thị với icon mắt gạch chéo (EyeOff) & hơi tối */}
        {isUiHidden ? (
          <button
            type="button"
            onClick={() => setIsUiHidden(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border-white/25"
            title={isEn ? 'Show UI' : 'Hiện lại giao diện'}
          >
            <EyeOff className="w-5 h-5 text-amber-300" />
          </button>
        ) : (
          <>
            {/* "2D" / "3D" Toggle Button (Không có icon) */}
            <button
              type="button"
              onClick={() => setIs3D((prev) => !prev)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-xl shadow-xl text-xs font-black tracking-wider transition-all active:scale-95 cursor-pointer ${
                is3D
                  ? 'bg-sky-500/90 border-sky-400 text-white shadow-sky-500/30'
                  : ''
              }`}
              style={
                !is3D
                  ? {
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }
                  : undefined
              }
              title={is3D ? 'Chuyển về góc 2D' : 'Chuyển sang góc 3D'}
            >
              <span className="text-xs font-black tracking-wider">{is3D ? '2D' : '3D'}</span>
            </button>

            {/* Về vị trí tỉnh của bạn (Icon La bàn màu đỏ, nút giữ màu theme) */}
            <button
              type="button"
              onClick={handleResetClick}
              className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-xl shadow-xl transition-all active:scale-95 cursor-pointer group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
              title={
                currentUser?.country
                  ? `Về tỉnh của bạn: ${extractProvinceFromLocation(currentUser.country) || 'Toàn quốc'}`
                  : 'Về vị trí tỉnh của bạn'
              }
            >
              <Compass className="w-5 h-5 text-rose-500 group-hover:rotate-45 transition-transform duration-300" />
            </button>

            {/* Nút Reset Map: Thu map lại thành 2D và zoom ra ngoài sao cho cả Việt Nam trong khung hình */}
            <button
              type="button"
              onClick={handleFullResetMap}
              className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-xl shadow-xl transition-all active:scale-95 cursor-pointer group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
              title={isEn ? 'Reset view to entire Vietnam (2D)' : 'Thu bản đồ về 2D nhìn trọn vẹn Việt Nam'}
            >
              <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
            </button>

            {/* NÚT MỚI: Hiện Tên Tỉnh Thành (Icon chữ A) */}
            <button
              type="button"
              onClick={() => setShowProvinceNames((p) => !p)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-xl shadow-xl transition-all active:scale-95 cursor-pointer group ${
                showProvinceNames
                  ? 'bg-sky-500/90 border-sky-400 text-white shadow-sky-500/30'
                  : ''
              }`}
              style={
                !showProvinceNames
                  ? {
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }
                  : undefined
              }
              title={showProvinceNames ? (isEn ? 'Hide province names' : 'Ẩn tên tỉnh thành') : (isEn ? 'Show province names' : 'Hiện tên tỉnh thành')}
            >
              <span className="font-serif font-black text-sm select-none">A</span>
            </button>

            {/* Nút Zoom In (+) */}
            <button
              type="button"
              onClick={() => setZoomInTrigger((c) => c + 1)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
              title={isEn ? 'Zoom in' : 'Phóng to'}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Nút Zoom Out (-) */}
            <button
              type="button"
              onClick={() => setZoomOutTrigger((c) => c + 1)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
              title={isEn ? 'Zoom out' : 'Thu nhỏ'}
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* NÚT MỚI: Toggle Ẩn Toàn Bộ UI (Icon Mắt) */}
            <button
              type="button"
              onClick={() => setIsUiHidden(true)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-xl shadow-xl transition-all active:scale-95 cursor-pointer group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
              title={isEn ? 'Hide UI' : 'Ẩn giao diện'}
            >
              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </>
        )}
      </div>

      {/* 4. Bottom-Left HUD Card: Thông tin tỉnh theo tâm crosshair & Chỉ số camera (phóng to 1.5x) */}
      <div
        className={`absolute bottom-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto select-none transition-all duration-700 ease-out ${
          hudReady && !isUiHidden ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div
          className="rounded-3xl border p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 min-w-[280px] sm:min-w-[340px] max-w-sm sm:max-w-md transition-all"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          <div className="flex flex-col gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border-ui)' }}>
            {/* Tên tỉnh & Số lượng user */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-black text-base sm:text-lg" style={{ color: 'var(--text-title)' }}>
                <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
                <span className="truncate max-w-[200px]">{hoveredProvinceId || '-'}</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-sky-400 shrink-0">
                {hoveredProvinceData ? `${hoveredProvinceData.playerCount || 0} user` : '-'}
              </span>
            </div>

            {/* Hardest classic của tỉnh */}
            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="ui-dim font-medium flex items-center gap-1.5 shrink-0">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                Hardest:
              </span>
              <span
                className="font-bold truncate text-right max-w-[190px]"
                style={{ color: 'var(--text-title)' }}
                title={hoveredProvinceData?.hardestClassic?.name || '-'}
              >
                {hoveredProvinceData?.hardestClassic ? (
                  <>
                    <span>{hoveredProvinceData.hardestClassic.name}</span>
                    {hoveredProvinceData.hardestClassic.placement ? (
                      <span className="text-amber-400 ml-1.5 text-xs font-black">
                        #{hoveredProvinceData.hardestClassic.placement}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="ui-dim font-bold">-</span>
                )}
              </span>
            </div>

            {/* Các clan (hiện theo tag, nhiều quá thì hiện 3 clan rồi ba chấm) */}
            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="ui-dim font-medium flex items-center gap-1.5 shrink-0">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                Clan:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {hoveredDisplayClans.length > 0 ? (
                  <>
                    {hoveredDisplayClans.map((c: any) => (
                      <span
                        key={c.tag}
                        className="px-2 py-0.5 rounded-md text-xs font-mono font-bold border"
                        style={{
                          borderColor: c.color || 'var(--border-ui)',
                          backgroundColor: 'var(--bg-subtle)',
                          color: c.color || 'var(--accent)',
                          ...(c.colorGradient
                            ? {
                                backgroundImage: c.colorGradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }
                            : {}),
                        }}
                      >
                        [{c.tag}]
                      </span>
                    ))}
                    {hoveredHasMoreClans && (
                      <span className="text-xs font-black ui-dim">...</span>
                    )}
                  </>
                ) : (
                  <span className="ui-dim font-bold">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Chỉ số zoom hiện tại & Góc quay (∠ 0°0') & Góc nghiêng (📐 0°) */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-mono gap-3 pt-0.5 ui-dim">
            <span className="font-extrabold" style={{ color: 'var(--text-title)' }}>
              Zoom: {Math.round(cameraMetrics.zoom * 10) / 10}x
            </span>
            <div className="flex items-center gap-3">
              <span className="font-black text-sky-400" title={isEn ? 'Yaw angle' : 'Góc quay'}>
                ∠ {formatYaw(cameraMetrics.yaw)}
              </span>
              <span className="font-black text-emerald-400" title={isEn ? 'Pitch angle' : 'Góc nghiêng'}>
                📐 {Math.round(cameraMetrics.pitch)}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Right Sidebar: Province Details, Clan Members & Mode Cycle */}
      {selectedProvinceId && (
        <aside
          className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-92 border-l backdrop-blur-2xl shadow-2xl flex flex-col animate-slide-in-right"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          {/* Sidebar Header */}
          <div
            className="p-4 border-b flex items-start justify-between gap-3"
            style={{ borderColor: 'var(--border-ui)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-black tracking-tight"
                  style={{ color: 'var(--text-title)' }}
                >
                  {selectedProvinceId}
                </h2>
                {selectedProvinceGeo?.region && (
                  <span
                    className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {selectedProvinceGeo.region === 'Bac'
                      ? 'Miền Bắc'
                      : selectedProvinceGeo.region === 'Trung'
                      ? 'Miền Trung'
                      : selectedProvinceGeo.region === 'Nam'
                      ? 'Miền Nam'
                      : 'Hải Đảo'}
                  </span>
                )}
              </div>
              <p className="text-xs ui-dim mt-0.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {isEn ? 'Total Players:' : 'Tổng số người chơi:'}{' '}
                  <b style={{ color: 'var(--text-title)' }}>
                    {selectedProvinceData?.playerCount || 0}
                  </b>
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Close button */}
              <button
                type="button"
                onClick={() => setSelectedProvinceId(null)}
                className="p-2 rounded-xl border transition-all active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
                title={isEn ? 'Close' : 'Đóng'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Nút Cycle Mode bên trong Sidebar: Tách riêng như nút bên ngoài thay vì chỉ là icon */}
          <div
            className="p-3 border-b"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-ui)',
            }}
          >
            <button
              type="button"
              onClick={handleCycleMode}
              className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-xl shadow-sm transition-all active:scale-95 cursor-pointer group"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
              title={isEn ? 'Click to switch mode' : 'Bấm để đổi chế độ'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex items-center gap-2 text-xs font-black truncate"
                  style={{ color: 'var(--accent)' }}
                >
                  {ModeIcon ? (
                    <ModeIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <img
                      src="/difficulties/EXTREME DEMON.png"
                      alt="Demons"
                      className="w-4 h-4 object-contain inline-block shrink-0"
                    />
                  )}
                  <span className="truncate">
                    {isEn ? MODE_LABELS[mode].nameEn : MODE_LABELS[mode].nameVi}
                  </span>
                </span>
              </div>
            </button>
          </div>

          {/* Province Summary Stats */}
          <div
            className="p-4 grid grid-cols-3 gap-2 border-b"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-ui)',
            }}
          >
            {/* National Rank */}
            <div
              className="p-2.5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <span className="text-[10px] font-bold ui-dim flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" /> {isEn ? 'Rank' : 'Xếp hạng'}
              </span>
              <span className="text-base font-black mt-1" style={{ color: 'var(--text-title)' }}>
                {selectedProvinceData?.nationalRank
                  ? `#${selectedProvinceData.nationalRank}`
                  : '—'}
              </span>
            </div>

            {/* Total Points / Players */}
            <div
              className="p-2.5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <span className="text-[10px] font-bold ui-dim flex items-center gap-1">
                {mode === 'POPULATION' ? (
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <Award className="w-3 h-3 text-sky-400" />
                )}
                <span>{mode === 'POPULATION' ? (isEn ? 'Users' : 'Số user') : (isEn ? 'Total' : 'Tổng điểm')}</span>
              </span>
              <span className="text-base font-black mt-1 truncate" style={{ color: 'var(--accent)' }}>
                {mode === 'POPULATION'
                  ? selectedProvinceData?.playerCount || 0
                  : selectedProvinceData?.totalScore
                  ? selectedProvinceData.totalScore.toLocaleString()
                  : '0'}
              </span>
            </div>

            {/* Share Percentage */}
            <div
              className="p-2.5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <span className="text-[10px] font-bold ui-dim flex items-center gap-1">
                <Users className="w-3 h-3 text-pink-400" /> {isEn ? 'Share' : 'Tỉ lệ'}
              </span>
              <span className="text-base font-black mt-1" style={{ color: 'var(--accent)' }}>
                {selectedProvinceData?.percent ? `${selectedProvinceData.percent}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Top 1 các bảng xếp hạng của tỉnh khi xếp theo số lượng người chơi */}
          {mode === 'POPULATION' && selectedProvinceData?.topStats && (
            <div
              className="p-3.5 border-b space-y-2"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <div className="text-[10.5px] font-black uppercase tracking-wider ui-dim flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{isEn ? 'Top 1 by Leaderboard' : 'Top 1 Các Bảng Xếp Hạng'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedProvinceData.topStats.classic && (
                  <Link
                    href={`/profile/${selectedProvinceData.topStats.classic.username}`}
                    className="p-2 rounded-xl border flex items-center gap-2 group cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0 truncate">
                      <div className="text-[11px] font-bold truncate group-hover:text-sky-400 transition-colors" style={{ color: 'var(--text-title)' }}>
                        {selectedProvinceData.topStats.classic.displayName}
                      </div>
                      <div className="text-[10px] font-black text-amber-400">
                        {selectedProvinceData.topStats.classic.score} Pt
                      </div>
                    </div>
                  </Link>
                )}

                {selectedProvinceData.topStats.platformer && (
                  <Link
                    href={`/profile/${selectedProvinceData.topStats.platformer.username}`}
                    className="p-2 rounded-xl border flex items-center gap-2 group cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <div className="min-w-0 truncate">
                      <div className="text-[11px] font-bold truncate group-hover:text-sky-400 transition-colors" style={{ color: 'var(--text-title)' }}>
                        {selectedProvinceData.topStats.platformer.displayName}
                      </div>
                      <div className="text-[10px] font-black text-purple-400">
                        {selectedProvinceData.topStats.platformer.score} Pt
                      </div>
                    </div>
                  </Link>
                )}

                {selectedProvinceData.topStats.demons && (
                  <Link
                    href={`/profile/${selectedProvinceData.topStats.demons.username}`}
                    className="p-2 rounded-xl border flex items-center gap-2 group cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <img
                      src="/difficulties/EXTREME DEMON.png"
                      alt="Demons"
                      className="w-3.5 h-3.5 object-contain shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <div className="text-[11px] font-bold truncate group-hover:text-sky-400 transition-colors" style={{ color: 'var(--text-title)' }}>
                        {selectedProvinceData.topStats.demons.displayName}
                      </div>
                      <div className="text-[10px] font-black text-rose-400">
                        {selectedProvinceData.topStats.demons.score} Demons
                      </div>
                    </div>
                  </Link>
                )}

                {selectedProvinceData.topStats.stars && (
                  <Link
                    href={`/profile/${selectedProvinceData.topStats.stars.username}`}
                    className="p-2 rounded-xl border flex items-center gap-2 group cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <Star className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                    <div className="min-w-0 truncate">
                      <div className="text-[11px] font-bold truncate group-hover:text-sky-400 transition-colors" style={{ color: 'var(--text-title)' }}>
                        {selectedProvinceData.topStats.stars.displayName}
                      </div>
                      <div className="text-[10px] font-black text-yellow-300">
                        {selectedProvinceData.topStats.stars.score} Stars
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Player List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold ui-dim mb-2 px-1">
              <span>{isEn ? 'Player & Clan' : 'Người chơi & Clan'}</span>
              {mode !== 'POPULATION' && <span>{isEn ? 'Points' : 'Điểm'}</span>}
            </div>

            {!selectedProvinceData ||
            !selectedProvinceData.players ||
            selectedProvinceData.players.length === 0 ? (
              <div className="py-16 text-center text-xs ui-dim">
                {isEn
                  ? 'No players recorded in this province yet.'
                  : 'Chưa có người chơi nào tại tỉnh này.'}
              </div>
            ) : (
              selectedProvinceData.players.map((player: any, idx: number) => {
                const rank = idx + 1;
                const isRank1 = rank === 1;
                const isRank2 = rank === 2;
                const isRank3 = rank === 3;

                const displayName =
                  player.displayName || player.gdUsername || player.username || '?';
                const profileHref = player.username ? `/profile/${player.username}` : '#';

                return (
                  <Link
                    key={player.id || idx}
                    href={profileHref}
                    className="flex items-center justify-between p-2.5 rounded-xl border transition-all group cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-ui)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank badge */}
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isRank1
                            ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : isRank2
                            ? 'bg-slate-200 text-slate-900'
                            : isRank3
                            ? 'bg-amber-700 text-white'
                            : 'border'
                        }`}
                        style={
                          !isRank1 && !isRank2 && !isRank3
                            ? {
                                backgroundColor: 'var(--bg-card)',
                                borderColor: 'var(--border-ui)',
                                color: 'var(--text-body)',
                              }
                            : undefined
                        }
                      >
                        {rank}
                      </span>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-xs text-sky-400 bg-sky-950/50">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Name & Clan */}
                      <div className="min-w-0">
                        <UserDisplayName
                          user={{
                            username: player.username,
                            displayName: player.displayName,
                            gdUsername: player.gdUsername,
                            nameColor: player.nameColor,
                            nameGradient: player.nameGradient,
                            nameGlow: player.nameGlow,
                            nameFont: player.nameFont,
                            clan: player.clan,
                          }}
                          fallbackName={displayName}
                          showClanTag={true}
                          tagPosition="left"
                          className="text-xs font-bold truncate"
                        />
                      </div>
                    </div>

                    {/* Score (chỉ hiện khi không phải mode POPULATION) */}
                    {mode !== 'POPULATION' && (
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black" style={{ color: 'var(--accent)' }}>
                          {formatScore(player)}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
