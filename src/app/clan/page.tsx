'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import CreateClanModal from '@/components/clan/CreateClanModal';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchClans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 shadow-xl" style={{ borderColor: 'var(--border-ui)' }}>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>Hệ thống Clan GDVN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ui-title tracking-tight">
              Danh Sách Clan
            </h1>
            <p className="text-xs sm:text-sm ui-dim leading-relaxed">
              Tập hợp các hội nhóm Geometry Dash tại Việt Nam. Tham gia cùng đồng đội hoặc thành lập Clan riêng để cùng nhau chinh phục bảng xếp hạng.
            </p>
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
                <span>Thành lập Clan</span>
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
            placeholder="Tìm theo tên hoặc tag Clan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs ui-input"
          />
        </div>

        {/* Sort, Order & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border ui-input cursor-pointer"
          >
            <option value="members">Đông thành viên nhất</option>
            <option value="sp">SP Coin cao nhất</option>
            <option value="newest">Mới thành lập</option>
            <option value="oldest">Lâu năm nhất</option>
          </select>

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
            {search ? 'Không có Clan phù hợp với từ khóa tìm kiếm.' : 'Hãy là người tiên phong thành lập Clan đầu tiên!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clans.map((clan) => {
            const tierInfo = getClanTier(clan.effectiveSp || 0);
            return (
              <Link
                key={clan.id}
                href={`/clan/${clan.slug}`}
                className="group ui-card rounded-2xl overflow-hidden border flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {/* Banner */}
                <div className="h-28 w-full relative bg-slate-800 overflow-hidden">
                  {clan.coverUrl ? (
                    <img src={clan.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800" />
                  )}
                  {/* Status Overlay if Suspended */}
                  {clan.isSuspended && (
                    <div className="absolute inset-0 bg-red-950/70 backdrop-blur-xs flex items-center justify-center gap-1.5 text-red-300 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Tạm dừng hoạt động</span>
                    </div>
                  )}
                </div>

                {/* Avatar & Content */}
                <div className="p-4 pt-0 relative flex-1 flex flex-col">
                  {/* Overlapping Avatar */}
                  <div className="flex items-end justify-between -mt-8 mb-3">
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden border-2 bg-slate-900 shadow-lg shrink-0"
                      style={{ borderColor: 'var(--bg-card)' }}
                    >
                      {clan.avatarUrl ? (
                        <img src={clan.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-lg text-amber-400">
                          {clan.tag[0]}
                        </div>
                      )}
                    </div>

                    {/* Tier Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        tierInfo.tier === 3
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : tierInfo.tier === 2
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {tierInfo.name}
                    </span>
                  </div>

                  {/* Title & Tag */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="font-mono font-black text-xs px-2 py-0.5 rounded-md border"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-subtle)',
                          ...(clan.colorGradient
                            ? {
                                backgroundImage: clan.colorGradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }
                            : { color: clan.color || '#f59e0b' }),
                        }}
                      >
                        [{clan.tag}]
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
                  <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs font-semibold ui-dim" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-1.5" title="Thành viên">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>{clan._count?.members || clan.members?.length || 0} / {tierInfo.maxMembers}</span>
                    </div>

                    <div className="flex items-center gap-1.5" title="Tổng SP Coin duy trì">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono text-amber-400 font-bold">{clan.effectiveSp || 0} SP</span>
                    </div>

                    {clan.leader && (
                      <div className="flex items-center gap-1 text-[11px]" title={`Leader: ${clan.leader.username}`}>
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate max-w-[90px]">{clan.leader.displayName || clan.leader.username}</span>
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
            const tierInfo = getClanTier(clan.effectiveSp || 0);
            return (
              <Link
                key={clan.id}
                href={`/clan/${clan.slug}`}
                className="p-4 flex items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-ui)' }}>
                    {clan.avatarUrl ? (
                      <img src={clan.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-400">
                        {clan.tag[0]}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-black text-xs"
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
                    <span>{clan._count?.members || 0} / {tierInfo.maxMembers}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{clan.effectiveSp || 0} SP</span>
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
