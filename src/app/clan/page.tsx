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
import CreateClanModal from '@/components/clan/CreateClanModal';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';

const SORT_OPTIONS: { value: 'members' | 'sp' | 'newest' | 'oldest'; label: string; icon: any }[] = [
  { value: 'members', label: 'Đông thành viên nhất', icon: Users },
  { value: 'sp', label: 'SP Coin cao nhất', icon: Coins },
  { value: 'newest', label: 'Mới nhất', icon: Sparkles },
  { value: 'oldest', label: 'Cũ nhất', icon: Clock },
];

export default function ClanListPage() {
  const { t } = useLanguage();

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
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 shadow-xl"
        style={{ borderColor: 'var(--border-ui)' }}
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
            const primaryThemeColor = clan.themeColor || clan.color || (isTier3 ? '#a855f7' : '#0ea5e9');

            const cardStyle: React.CSSProperties = {
              borderColor: 'var(--border-ui)',
            };

            if (isTier2Plus) {
              if (clan.themeGradient) {
                cardStyle.backgroundImage = `linear-gradient(to bottom, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.94)), ${clan.themeGradient}`;
                const gMatch = clan.themeGradient.match(/(\d+)deg/);
                const colMatch = clan.themeGradient.match(/#[a-fA-F0-9]{3,8}/g);
                if (gMatch && colMatch && colMatch.length >= 2) {
                  const angle = parseInt(gMatch[1], 10) || 135;
                  const rad = (angle * Math.PI) / 180;
                  const ox = Math.round(Math.sin(rad) * 8);
                  const oy = Math.round(-Math.cos(rad) * 8);
                  cardStyle.borderColor = colMatch[0];
                  cardStyle.boxShadow = isTier3
                    ? `${ox}px ${oy}px 24px 2px ${colMatch[1]}77, ${-ox}px ${-oy}px 24px 2px ${colMatch[0]}77, 0 0 20px 2px ${colMatch[0]}55`
                    : `${ox}px ${oy}px 16px 1px ${colMatch[1]}55, ${-ox}px ${-oy}px 16px 1px ${colMatch[0]}55`;
                } else {
                  cardStyle.borderColor = `color-mix(in srgb, ${primaryThemeColor} 55%, var(--border-ui))`;
                  cardStyle.boxShadow = `0 0 16px color-mix(in srgb, ${primaryThemeColor} 35%, transparent)`;
                }
              } else if (clan.themeColor) {
                cardStyle.backgroundColor = `color-mix(in srgb, ${clan.themeColor} 12%, var(--bg-card))`;
                cardStyle.borderColor = `color-mix(in srgb, ${primaryThemeColor} 55%, var(--border-ui))`;
                cardStyle.boxShadow = `0 0 16px color-mix(in srgb, ${primaryThemeColor} 35%, transparent)`;
              }
            }

            return (
              <Link
                key={clan.id}
                href={`/clan/${clan.slug}`}
                className="group ui-card rounded-2xl overflow-hidden border flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
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
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm ${
                      tierInfo.tier === 3
                        ? 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                        : tierInfo.tier === 2
                        ? 'bg-sky-950/80 text-sky-300 border-sky-500/30'
                        : tierInfo.tier === 1
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                        : 'bg-red-950/80 text-red-300 border-red-500/30'
                    }`}
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
            const primaryThemeColor = clan.themeColor || clan.color || (isTier3 ? '#a855f7' : '#0ea5e9');

            const rowStyle: React.CSSProperties = {};
            if (isTier2Plus) {
              if (clan.themeGradient) {
                rowStyle.backgroundImage = `linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), ${clan.themeGradient}`;
              } else if (clan.themeColor) {
                rowStyle.backgroundColor = `color-mix(in srgb, ${clan.themeColor} 8%, var(--bg-card))`;
              }
              if (isTier3) {
                rowStyle.boxShadow = `inset 3px 0 0 ${primaryThemeColor}`;
              } else {
                rowStyle.boxShadow = `inset 2px 0 0 ${primaryThemeColor}`;
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
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      tierInfo.tier === 3
                        ? 'bg-purple-500/10 text-purple-400'
                        : tierInfo.tier === 2
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
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
