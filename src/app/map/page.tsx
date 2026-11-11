'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Compass,
  Box,
  Layers,
  RotateCw,
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
  ExternalLink,
} from 'lucide-react';
import { VietnamMapCanvas } from '@/components/map/VietnamMapCanvas';
import { VIETNAM_PROVINCES_GEO } from '@/lib/vietnamGeoData';
import { extractProvinceFromLocation } from '@/lib/location';
import { formatCp } from '@/lib/creatorPoints';
import { useLanguage } from '@/components/LanguageContext';
import { refreshSessionUser } from '@/lib/sessionClient';

const MODES = [
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
  CLASSIC: { nameVi: 'Classic PP', nameEn: 'Classic PP', icon: Star },
  PLATFORMER: { nameVi: 'Platformer PP', nameEn: 'Platformer PP', icon: Gamepad2 },
  CHALLENGE: { nameVi: 'Challenge PP', nameEn: 'Challenge PP', icon: Crosshair },
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

  const [mode, setMode] = useState<LeaderboardMode>('CLASSIC');
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [is3D, setIs3D] = useState<boolean>(false);
  const [snapCounter, setSnapCounter] = useState<number>(0);

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
    if (!player) return '0';
    if (mode === 'CREATOR') {
      return `${formatCp(player.creatorPoints || 0)} CP`;
    }
    if (mode === 'STARS') {
      return `${Number(player.statValue ?? player.gdStars ?? 0).toLocaleString()} Stars`;
    }
    if (mode === 'MOONS') {
      return `${Number(player.statValue ?? player.gdMoons ?? 0).toLocaleString()} Moons`;
    }
    if (mode === 'DEMONS') {
      return `${Number(player.statValue ?? player.gdDemons ?? 0).toLocaleString()} Demons`;
    }
    if (mode === 'ACTIVITY') {
      return `${Number(player.activityPoints ?? 0).toLocaleString()} Act`;
    }
    const pts =
      mode === 'PLATFORMER'
        ? player.platformerPp
        : mode === 'CHALLENGE'
        ? player.challengePp
        : player.classicPp;
    return `${Number(pts || 0).toFixed(2)} Pt`;
  };

  const ModeIcon = MODE_LABELS[mode].icon;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Fullscreen Map Canvas */}
      <VietnamMapCanvas
        mapData={mapData}
        selectedProvinceId={selectedProvinceId}
        onSelectProvince={(id) => setSelectedProvinceId(id)}
        currentUser={currentUser}
        currentMode={mode}
        is3D={is3D}
        onToggle3D={() => setIs3D((prev) => !prev)}
        onRequestSnapToUser={snapCounter}
      />

      {/* 2. Top Header Navigation Bar */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Back to leaderboard + Title */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/leaderboard"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-white/10 backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer"
            title={isEn ? 'Back to Leaderboard' : 'Trở về Bảng xếp hạng'}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2.5">
            <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              🇻🇳 {isEn ? 'Vietnam Ranking Map' : 'Bản Đồ Xếp Hạng Việt Nam'}
            </span>
            <span className="hidden sm:inline-block w-px h-3.5 bg-white/20" />
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
              {ModeIcon ? (
                <ModeIcon className="w-3.5 h-3.5" />
              ) : (
                <img
                  src="/difficulties/EXTREME DEMON.png"
                  alt="Demons"
                  className="w-3.5 h-3.5 object-contain inline-block"
                />
              )}
              {isEn ? MODE_LABELS[mode].nameEn : MODE_LABELS[mode].nameVi}
            </span>
          </div>
        </div>

        {/* Right: Leaderboard Mode Cycle Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleCycleMode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 border border-white/10 backdrop-blur-md shadow-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title={isEn ? 'Click to cycle mode' : 'Nhấn để đổi chế độ bảng xếp hạng'}
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400 animate-spin-reverse" />
            <span className="flex items-center gap-1.5">
              {ModeIcon ? (
                <ModeIcon className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <img
                  src="/difficulties/EXTREME DEMON.png"
                  alt="Demons"
                  className="w-3.5 h-3.5 object-contain inline-block"
                />
              )}
              <span className="hidden md:inline">{isEn ? 'Mode:' : 'Chế độ:'}</span>
              <span className="text-white">
                {isEn ? MODE_LABELS[mode].nameEn : MODE_LABELS[mode].nameVi}
              </span>
            </span>
          </button>
        </div>
      </header>

      {/* 3. Floating Quick Action Controls (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-30 flex items-center gap-2.5">
        {/* "2D" / "3D" Toggle Button */}
        <button
          type="button"
          onClick={() => setIs3D((prev) => !prev)}
          className={`flex items-center justify-center px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-xl text-xs font-black tracking-wider transition-all active:scale-95 cursor-pointer ${
            is3D
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)]'
              : 'bg-slate-900/85 hover:bg-slate-800/90 border-white/15 text-slate-200'
          }`}
          title={is3D ? 'Chuyển về góc 2D' : 'Chuyển sang góc Synthwave 3D'}
        >
          {is3D ? (
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> 2D
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-pink-400" /> 3D
            </span>
          )}
        </button>

        {/* Compass Button (Return to User's Province) */}
        <button
          type="button"
          onClick={() => setSnapCounter((c) => c + 1)}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 text-sky-400 hover:text-sky-300 border border-white/15 backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer group"
          title={
            currentUser?.country
              ? `Về tỉnh của bạn: ${extractProvinceFromLocation(currentUser.country) || 'Toàn quốc'}`
              : 'Về vị trí tỉnh của bạn'
          }
        >
          <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </div>

      {/* 4. Right Sidebar: Province Details & Player Ranking */}
      {selectedProvinceId && (
        <aside className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-96 bg-slate-900/95 border-l border-white/10 backdrop-blur-xl shadow-2xl flex flex-col animate-slide-in-right">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{selectedProvinceId}</h2>
                {selectedProvinceGeo?.region && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
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
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn ? 'Province Leaderboard' : 'Bảng xếp hạng khu vực tỉnh/thành'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Cycle mode inside sidebar */}
              <button
                type="button"
                onClick={handleCycleMode}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isEn ? 'Switch Mode' : 'Đổi chế độ'}
              >
                <RotateCw className="w-4 h-4 text-sky-400" />
              </button>
              {/* Close button */}
              <button
                type="button"
                onClick={() => setSelectedProvinceId(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isEn ? 'Close' : 'Đóng'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Province Summary Stats */}
          <div className="p-4 grid grid-cols-3 gap-2 border-b border-white/10 bg-slate-950/40">
            {/* National Rank */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" /> {isEn ? 'Rank' : 'Xếp hạng'}
              </span>
              <span className="text-base font-black text-white mt-1">
                {selectedProvinceData?.nationalRank
                  ? `#${selectedProvinceData.nationalRank}`
                  : '—'}
              </span>
            </div>

            {/* Total Points */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Award className="w-3 h-3 text-sky-400" /> {isEn ? 'Total' : 'Tổng điểm'}
              </span>
              <span className="text-base font-black text-sky-400 mt-1 truncate">
                {selectedProvinceData?.totalScore
                  ? selectedProvinceData.totalScore.toLocaleString()
                  : '0'}
              </span>
            </div>

            {/* Share Percentage */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-pink-400" /> {isEn ? 'Share' : 'Tỉ lệ'}
              </span>
              <span className="text-base font-black text-pink-400 mt-1">
                {selectedProvinceData?.percent ? `${selectedProvinceData.percent}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Player List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-1">
              <span>{isEn ? 'Player' : 'Người chơi'}</span>
              <span>{isEn ? 'Points' : 'Điểm'}</span>
            </div>

            {!selectedProvinceData ||
            !selectedProvinceData.players ||
            selectedProvinceData.players.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
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
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group cursor-pointer"
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
                            : 'bg-white/10 text-slate-300'
                        }`}
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
                        <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                          {displayName}
                        </div>
                        {player.clan && (
                          <div className="text-[10px] text-slate-400 truncate">
                            [{player.clan.tag || player.clan.name}]
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-sky-400">
                        {formatScore(player)}
                      </div>
                    </div>
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
