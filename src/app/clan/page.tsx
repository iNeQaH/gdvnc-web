'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Coins,
  Crown,
  LayoutGrid,
  List,
  ArrowUpDown,
  Shield,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';
import CreateClanModal from '@/components/clan/CreateClanModal';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';

function hexToRgba(hex: string, alpha: number): string {
  const m = String(hex || '').trim().match(/^#?([0-9a-fA-F]{3,8})$/);
  if (!m) return `rgba(14, 165, 233, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(14, 165, 233, ${alpha})`;
}

const SORT_OPTIONS: { value: 'members' | 'sp' | 'newest' | 'oldest'; label: string; icon: any }[] = [
  { value: 'members', label: 'Đông thành viên nhất', icon: Users },
  { value: 'sp', label: 'SP Coin cao nhất', icon: Coins },
  { value: 'newest', label: 'Mới nhất', icon: Sparkles },
  { value: 'oldest', label: 'Cũ nhất', icon: Clock },
];

export default function ClanListPage() {
  const { t } = useLanguage();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [clans, setClans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSp, setUserSp] = useState<number>(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'members' | 'sp' | 'newest' | 'oldest'>('members');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('gdvnc_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setCurrentUser(u);
        fetch(`/api/profile/${u.username}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.user) {
              setCurrentUser(data.user);
              setUserSp(calculateUserSp(data.user));
            }
          })
          .catch(() => {});
      } catch (e) {}
    }
  }, []);

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search debounce: 1000ms (1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchClans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        search,
        sort,
        order,
      });
      const res = await fetch(`/api/clans?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setClans(data.clans || []);
      }
    } catch {
      setClans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClans();
  }, [search, sort, order]);

  const userClan = currentUser?.clanMember?.clan || currentUser?.clan;
  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sort) || SORT_OPTIONS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border shadow-xl transition-colors duration-300"
        style={{
          borderColor: 'var(--border-ui)',
          backgroundColor: 'var(--bg-card)',
          backgroundImage: isDark
            ? 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))'
            : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.98), var(--bg-subtle), rgba(255, 255, 255, 0.98))',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black ui-title tracking-tight">
              Danh Sách Clan
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {userClan ? (
              <Link
                href={`/clan/${userClan.slug}`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <Shield className="w-4 h-4 text-sky-400" />
                <span>Clan của bạn: [{userClan.tag}]</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-md cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Clan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border ui-card" style={{ borderColor: 'var(--border-ui)' }}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ui-dim" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên hoặc tag Clan"
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs ui-input"
          />
        </div>

        {/* Sort, Order & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Styled Sort Dropdown */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              {currentSortOption.icon && <currentSortOption.icon className="w-3.5 h-3.5 text-amber-400" />}
              <span>{currentSortOption.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 ui-dim transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div
                className="absolute right-0 sm:left-0 top-full mt-1.5 z-40 w-52 rounded-xl border shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSort(opt.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors text-left cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-400 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 ui-title'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-amber-400" />
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Asc / Desc Button */}
          <button
            type="button"
            onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            title={order === 'desc' ? 'Thứ tự giảm dần' : 'Thứ tự tăng dần'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{order === 'desc' ? 'Giảm dần' : 'Tăng dần'}</span>
          </button>

          {/* View Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            title={viewMode === 'grid' ? 'Chế độ xem Danh sách' : 'Chế độ xem Lưới'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clan Content */}
      {loading ? (
        <div className="p-16 text-center text-xs ui-dim font-medium">Đang tải danh sách Clan...</div>
      ) : clans.length === 0 ? (
        <div className="ui-card p-12 text-center space-y-3">
          <Shield className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold ui-title">Chưa tìm thấy Clan nào</h3>
          <p className="text-xs ui-dim">
            {search ? 'Không có Clan phù hợp với từ khóa tìm kiếm.' : 'Hãy là người tiên phong tạo Clan đầu tiên!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clans.map((clan) => {
            const sp = clan.totalSp ?? clan.effectiveSp ?? 0;
            const memberCount = clan.memberCount ?? clan._count?.members ?? clan.members?.length ?? 0;
            const tierInfo = getClanTier(sp);
            const isTier2Plus = tierInfo.tier >= 2;
            const isTier3 = tierInfo.tier === 3;
            const rawGlow = (clan.themeGradient || '') + ' ' + (clan.themeColor || '');
            const glowMatch = rawGlow.match(/\/\*glow:(\d+):(\d+)\*\//);
            const cardGlowEnabled = glowMatch ? glowMatch[1] === '1' : true;
            const cardGlowOpacity = glowMatch ? Math.min(Math.max(parseInt(glowMatch[2], 10) || 70, 10), 100) : 70;

            const cleanThemeGradient = clan.themeGradient ? clan.themeGradient.replace(/\/\*.*?\*\//g, '').trim() : null;
            const cleanThemeColor = clan.themeColor ? (clan.themeColor.match(/#([0-9a-fA-F]{3,8})/) ? clan.themeColor.match(/#([0-9a-fA-F]{3,8})/)![0] : clan.themeColor.replace(/\/\*.*?\*\//g, '').trim()) : null;

            const rawPrimary = cleanThemeColor || clan.color || (isTier3 ? '#c084fc' : isTier2Plus ? '#38bdf8' : '#fbbf24');
            const primaryThemeColor = rawPrimary.match(/#([0-9a-fA-F]{3,8})/) ? rawPrimary.match(/#([0-9a-fA-F]{3,8})/)![0] : rawPrimary;

            const colMatch = cleanThemeGradient ? cleanThemeGradient.match(/#[a-fA-F0-9]{3,8}/g) : null;
            const c1 = colMatch && colMatch[0] ? colMatch[0] : primaryThemeColor;
            const c2 = colMatch && colMatch[1] ? colMatch[1] : (cleanThemeColor || clan.color || (isTier3 ? '#f472b6' : isTier2Plus ? '#34d399' : '#f59e0b'));

            const cardStyle: React.CSSProperties = {
              borderColor: 'var(--border-ui)',
            };

            if (isTier2Plus) {
              // Background đồng bộ mềm mại theo màu/viền/glow của Clan, không dùng nền đen cứng
              cardStyle.backgroundImage = isDark
                ? `radial-gradient(ellipse 110% 70% at 50% 0%, ${hexToRgba(c1, isTier3 ? 0.32 : 0.24)}, transparent 75%), linear-gradient(to bottom, color-mix(in srgb, ${c1} ${isTier3 ? '24%' : '18%'}, #0c0e18), color-mix(in srgb, ${c2} ${isTier3 ? '26%' : '20%'}, #060810))`
                : `radial-gradient(ellipse 110% 70% at 50% 0%, ${hexToRgba(c1, isTier3 ? 0.18 : 0.14)}, transparent 75%), linear-gradient(to bottom, color-mix(in srgb, ${c1} ${isTier3 ? '12%' : '8%'}, #ffffff), color-mix(in srgb, ${c2} ${isTier3 ? '14%' : '10%'}, #f8fafc))`;

              cardStyle.borderColor = isDark
                ? `color-mix(in srgb, ${c1} ${isTier3 ? '85%' : '75%'}, #ffffff)`
                : `color-mix(in srgb, ${c1} ${isTier3 ? '75%' : '65%'}, #000000)`;

              if (cardGlowEnabled && (isTier3 || (isTier2Plus && clan.themeGradient))) {
                const gMatch = cleanThemeGradient ? cleanThemeGradient.match(/(\d+)deg/) : null;
                const angle = gMatch ? (parseInt(gMatch[1], 10) || 135) : 135;
                const rad = (angle * Math.PI) / 180;
                const ox = Math.round(Math.sin(rad) * 8);
                const oy = Math.round(-Math.cos(rad) * 8);
                const alpha = (cardGlowOpacity / 100) * (isDark ? (isTier3 ? 0.65 : 0.45) : (isTier3 ? 0.4 : 0.28));
                const blur = Math.round(14 + (cardGlowOpacity / 100) * (isTier3 ? 16 : 10));

                if (colMatch && colMatch.length >= 2) {
                  cardStyle.boxShadow = `${ox}px ${oy}px ${blur}px 2px ${hexToRgba(c2, alpha)}, ${-ox}px ${-oy}px ${blur}px 2px ${hexToRgba(c1, alpha)}, 0 0 ${Math.round(blur * 0.75)}px 2px ${hexToRgba(c1, alpha * 0.75)}`;
                } else {
                  cardStyle.boxShadow = `0 0 ${blur}px 2px ${hexToRgba(c1, alpha)}, 0 0 ${Math.round(blur * 0.6)}px ${hexToRgba(c2, alpha * 0.7)}`;
                }
              } else if (isTier2Plus) {
                // Tier 2 ambient light
                const alpha = isDark ? 0.35 : 0.2;
                cardStyle.boxShadow = `0 0 14px ${hexToRgba(c1, alpha)}`;
              } else {
                cardStyle.boxShadow = 'none';
              }
            }

            return (
              <Link
                key={clan.id}
                href={`/clan/${clan.slug}`}
                className="group ui-card rounded-2xl overflow-hidden border flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
                style={cardStyle}
              >
                {/* Cover Banner */}
                <div className="h-36 w-full relative bg-slate-900 overflow-hidden">
                  {clan.coverUrl ? (
                    <img
                      src={clan.coverUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                      <span className="font-mono font-black text-2xl text-white/20">[{clan.tag}]</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Tier Badge on top-right */}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 backdrop-blur-md shadow-lg ${
                      tierInfo.tier === 3
                        ? 'text-white'
                        : tierInfo.tier === 2
                        ? 'bg-sky-500/25 text-sky-200 border-sky-400/60 shadow-[0_0_14px_rgba(14,165,233,0.45)] dark:bg-sky-500/30 dark:text-sky-100 dark:border-sky-300/70'
                        : tierInfo.tier === 1
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100 dark:border-amber-400/60'
                        : 'bg-red-500/20 text-red-200 border-red-400/50'
                    }`}
                    style={
                      tierInfo.tier === 3
                        ? {
                            borderColor: cardStyle.borderColor || primaryThemeColor,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            boxShadow: `0 0 10px ${c1 || primaryThemeColor}, inset 0 0 6px ${hexToRgba(c1 || primaryThemeColor, 0.4)}`,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                  >
                    {tierInfo.name}
                  </span>

                  {/* Status Overlay if Suspended */}
                  {clan.isSuspended && (
                    <div className="absolute inset-0 bg-red-950/80 backdrop-blur-xs flex items-center justify-center gap-1.5 text-red-300 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Tạm dừng hoạt động</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-lg border font-mono font-black text-xs shadow-2xs backdrop-blur-xs select-none"
                        style={{
                          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.05)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        <span
                          style={
                            clan.colorGradient
                              ? {
                                  backgroundImage: clan.colorGradient,
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }
                              : { color: clan.color || '#f59e0b' }
                          }
                        >
                          [{clan.tag}]
                        </span>
                      </span>
                      <h2 className="font-bold text-sm ui-title truncate group-hover:text-sky-400 transition-colors">
                        {clan.name}
                      </h2>
                    </div>

                    {clan.description && (
                      <p className="text-xs ui-dim line-clamp-2 leading-relaxed">
                        {clan.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Stats Bar */}
                  <div
                    className="pt-3 border-t flex items-center justify-between text-xs font-semibold ui-dim"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-1.5" title="Thành viên">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {memberCount} / {tierInfo.maxMembers}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" title="Tổng SP Coin duy trì">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono text-amber-400 font-bold">{sp} SP</span>
                    </div>

                    {clan.leader && (
                      <div className="flex items-center gap-1 text-[11px]" title={`Leader: ${clan.leader.username}`}>
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate max-w-[90px]">
                          {clan.leader.displayName || clan.leader.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="ui-card rounded-2xl border divide-y overflow-hidden" style={{ borderColor: 'var(--border-ui)' }}>
          {clans.map((clan) => {
            const sp = clan.totalSp ?? clan.effectiveSp ?? 0;
            const memberCount = clan.memberCount ?? clan._count?.members ?? clan.members?.length ?? 0;
            const tierInfo = getClanTier(sp);
            const isTier2Plus = tierInfo.tier >= 2;
            const isTier3 = tierInfo.tier === 3;
            const rawPrimary = clan.themeColor || clan.color || (isTier3 ? '#c084fc' : isTier2Plus ? '#38bdf8' : '#fbbf24');
            const primaryThemeColor = rawPrimary.match(/#([0-9a-fA-F]{3,8})/) ? rawPrimary.match(/#([0-9a-fA-F]{3,8})/)![0] : rawPrimary;

            const rowStyle: React.CSSProperties = {};
            if (isTier2Plus) {
              if (clan.themeGradient) {
                const cleanThemeGrad = clan.themeGradient.replace(/\/\*.*?\*\//g, '').trim();
                const colMatch = cleanThemeGrad.match(/#[a-fA-F0-9]{3,8}/g);
                const c1 = colMatch && colMatch[0] ? colMatch[0] : primaryThemeColor;
                const c2 = colMatch && colMatch[1] ? colMatch[1] : c1;
                rowStyle.backgroundImage = isDark
                  ? `linear-gradient(to right, color-mix(in srgb, ${c1} ${isTier3 ? '22%' : '14%'}, #0d0f1a), color-mix(in srgb, ${c2} ${isTier3 ? '20%' : '12%'}, #070912))`
                  : `linear-gradient(to right, color-mix(in srgb, ${c1} ${isTier3 ? '12%' : '8%'}, #ffffff), color-mix(in srgb, ${c2} ${isTier3 ? '10%' : '6%'}, #f8fafc))`;
              } else if (clan.themeColor) {
                const cleanThemeCol = clan.themeColor.match(/#([0-9a-fA-F]{3,8})/) ? clan.themeColor.match(/#([0-9a-fA-F]{3,8})/)![0] : clan.themeColor.replace(/\/\*.*?\*\//g, '').trim();
                rowStyle.backgroundColor = `color-mix(in srgb, ${cleanThemeCol} ${isDark ? (isTier3 ? '20%' : '14%') : (isTier3 ? '10%' : '6%')}, var(--bg-card))`;
              }
              if (isTier3) {
                rowStyle.boxShadow = `inset 4px 0 0 ${primaryThemeColor}`;
              } else {
                rowStyle.boxShadow = `inset 3px 0 0 ${primaryThemeColor}`;
              }
            }

            return (
              <Link
                key={clan.id}
                href={`/clan/${clan.slug}`}
                className="p-4 flex items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={rowStyle}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-16 h-12 rounded-xl overflow-hidden border bg-slate-900 shrink-0 relative"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    {clan.coverUrl ? (
                      <img src={clan.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-xs font-mono">
                        [{clan.tag}]
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-lg border font-mono font-black text-xs shadow-2xs backdrop-blur-xs select-none"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.45)',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                      >
                        <span
                          style={
                            clan.colorGradient
                              ? {
                                  backgroundImage: clan.colorGradient,
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }
                              : { color: clan.color || '#f59e0b' }
                          }
                        >
                          [{clan.tag}]
                        </span>
                      </span>
                      <span className="font-bold text-sm ui-title truncate">{clan.name}</span>
                    </div>
                    {clan.description && (
                      <p className="text-xs ui-dim truncate max-w-md mt-0.5">{clan.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 ui-dim">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{memberCount} / {tierInfo.maxMembers}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{sp} SP</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      tierInfo.tier === 3
                        ? 'text-white border-2'
                        : tierInfo.tier === 2
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 dark:bg-sky-500/30 dark:text-sky-200'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 dark:bg-amber-500/25 dark:text-amber-200'
                    }`}
                    style={
                      tierInfo.tier === 3
                        ? {
                            borderColor: primaryThemeColor,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            boxShadow: `0 0 10px ${primaryThemeColor}`,
                            color: '#ffffff',
                          }
                        : undefined
                    }
                  >
                    {tierInfo.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <CreateClanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userSp={userSp}
        onCreated={() => {
          fetchClans();
        }}
      />
    </div>
  );
}
