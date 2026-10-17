'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, Moon, Wrench, Swords, Search, CheckCircle2, User, Trash2, Gamepad2, Crosshair, X, Trophy, Crown, Heart } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { formatCp } from '@/lib/creatorPoints';
import { levelPath } from '@/lib/levelUrl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/GlobalToast';
import BadgeIcon from '@/components/BadgeIcon';
import { UserDisplayName } from '@/components/UserDisplayName';
import { useTheme } from '@/components/ThemeProvider';
import { getUserListRowStyle } from '@/lib/userListRowStyle';

import FloatingNav from '@/components/FloatingNav';
import { AnimatedTabs } from '@/components/AnimatedTabs';

function LeaderboardPodium({
  players,
  mode,
}: {
  players: any[];
  mode: 'CLASSIC' | 'PLATFORMER' | 'CHALLENGE' | 'CREATOR';
}) {
  const { t } = useLanguage();
  if (!players || players.length === 0) return null;

  const top5 = players.slice(0, 5);

  let podiumSlots: Array<{ item: any; rank: number }> = [];
  if (top5.length === 1) {
    podiumSlots = [{ item: top5[0], rank: top5[0].rank || 1 }];
  } else if (top5.length === 2) {
    podiumSlots = [
      { item: top5[1], rank: top5[1].rank || 2 },
      { item: top5[0], rank: top5[0].rank || 1 },
    ];
  } else if (top5.length === 3) {
    podiumSlots = [
      { item: top5[1], rank: top5[1].rank || 2 },
      { item: top5[0], rank: top5[0].rank || 1 },
      { item: top5[2], rank: top5[2].rank || 3 },
    ];
  } else if (top5.length === 4) {
    podiumSlots = [
      { item: top5[3], rank: top5[3].rank || 4 },
      { item: top5[1], rank: top5[1].rank || 2 },
      { item: top5[0], rank: top5[0].rank || 1 },
      { item: top5[2], rank: top5[2].rank || 3 },
    ];
  } else {
    podiumSlots = [
      { item: top5[3], rank: top5[3].rank || 4 },
      { item: top5[1], rank: top5[1].rank || 2 },
      { item: top5[0], rank: top5[0].rank || 1 },
      { item: top5[2], rank: top5[2].rank || 3 },
      { item: top5[4], rank: top5[4].rank || 5 },
    ];
  }

  const formatPoints = (player: any) => {
    if (mode === 'CREATOR') {
      return `${formatCp(player.creatorPoints)} CP`;
    }
    const pts = mode === 'PLATFORMER' ? player.platformerPp : mode === 'CHALLENGE' ? player.challengePp : player.classicPp;
    return `${Number(pts || 0).toFixed(2)} Pt`;
  };

  return (
    <div
      className="ui-card rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-xl space-y-3"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-sm font-bold ui-title flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" /> {t('leaderboard.podium_title')}
          </h2>
          <p className="text-[11px] ui-dim mt-0.5">
            {t('leaderboard.podium_desc')}
          </p>
        </div>
      </div>

      {/* Podium Stage Container */}
      <div className="pt-3 pb-1 px-1 flex-1 flex flex-col justify-end">
        <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 min-h-[220px] sm:min-h-[240px]">
          {podiumSlots.map(({ item, rank }) => {
            const isRank1 = rank === 1;
            const isRank2 = rank === 2;
            const isRank3 = rank === 3;
            const isRank4 = rank === 4;
            const isRank5 = rank === 5;

            const ptVal = formatPoints(item);
            const displayName = item.displayName || item.gdUsername || item.username || '?';
            const profileHref = item.username ? `/profile/${item.username}` : null;

            const pedestalHeight = isRank1
              ? 'h-24 sm:h-28'
              : isRank2
              ? 'h-18 sm:h-22'
              : isRank3
              ? 'h-14 sm:h-17'
              : isRank4
              ? 'h-10 sm:h-12'
              : 'h-8 sm:h-10';

            const pedestalBorder = isRank1
              ? 'border-t-4 border-amber-300 dark:border-amber-400 bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 shadow-md'
              : isRank2
              ? 'border-t-4 border-slate-300 dark:border-slate-300 bg-gradient-to-b from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700 shadow-md'
              : isRank3
              ? 'border-t-4 border-amber-500 dark:border-amber-600 bg-gradient-to-b from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900 shadow-md'
              : 'border-t-2 border-slate-400 dark:border-slate-500 bg-gradient-to-b from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 shadow-sm';

            const avatarSize = isRank1
              ? 'w-13 h-13 sm:w-16 sm:h-16 ring-3 ring-amber-500 dark:ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : isRank2
              ? 'w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-slate-500 dark:ring-slate-300 shadow-md'
              : isRank3
              ? 'w-10 h-10 sm:w-11 sm:h-11 ring-2 ring-amber-600 shadow-md'
              : 'w-8 h-8 sm:w-9 sm:h-9 ring-1 ring-slate-400 dark:ring-white/20';

            return (
              <div
                key={item.id || rank}
                className={`flex flex-col items-center flex-1 min-w-0 max-w-[90px] sm:max-w-[110px] ${
                  isRank1 ? 'z-10' : 'z-[1]'
                }`}
              >
                {/* 1. Điểm trên avatar */}
                <div className="flex flex-col items-center mb-1.5">
                  {isRank1 && (
                    <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400 drop-shadow mb-0.5 animate-bounce" />
                  )}
                  <span
                    className={`font-mono font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap text-white ${
                      isRank1
                        ? 'bg-amber-600 border-amber-400'
                        : isRank2
                        ? 'bg-slate-600 border-slate-400'
                        : isRank3
                        ? 'bg-amber-800 border-amber-600'
                        : 'bg-slate-700 border-slate-500 text-[9px]'
                    }`}
                  >
                    {ptVal}
                  </span>
                </div>

                {/* 2. Avatar */}
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="group relative block transition-transform hover:scale-105"
                  >
                    <div className={`rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 shrink-0 ${avatarSize}`}>
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xs ui-dim">
                          {displayName[0]}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className={`rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 shrink-0 ${avatarSize}`}>
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xs ui-dim">
                        {displayName[0]}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tên dưới avatar */}
                <div className="text-center mt-1.5 mb-1.5 w-full px-0.5">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="font-bold text-[11px] sm:text-xs ui-title truncate block hover:underline"
                    >
                      <UserDisplayName user={item} fallbackName={displayName} linkClan />
                    </Link>
                  ) : (
                    <span className="font-bold text-[11px] sm:text-xs ui-title truncate block">
                      <UserDisplayName user={item} fallbackName={displayName} linkClan />
                    </span>
                  )}
                </div>

                {/* 4. Biểu đồ cột */}
                <div
                  className={`w-full rounded-t-xl flex flex-col items-center justify-start pt-2 transition-all ${pedestalHeight} ${pedestalBorder}`}
                >
                  <span
                    className={`font-black select-none text-white drop-shadow-xs ${
                      isRank1
                        ? 'text-xl sm:text-2xl'
                        : isRank2
                        ? 'text-lg sm:text-xl'
                        : isRank3
                        ? 'text-base sm:text-lg'
                        : 'text-sm'
                    }`}
                  >
                    #{rank}
                  </span>
                  <span
                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-0.5 text-white/95 drop-shadow-xs"
                  >
                    {isRank1 ? 'TOP 1' : `TOP ${rank}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLanguage();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const { showConfirm, showToast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<'CLASSIC' | 'PLATFORMER' | 'CHALLENGE' | 'CREATOR'>('CLASSIC');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  // Rotation step for quick stats cards
  const [rotateStep, setRotateStep] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'PC' | 'MOBILE'>('ALL');

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
  }, []);

  useEffect(() => {
    fetch('/api/leaderboard/highlights')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHighlights(data.highlights);
      })
      .catch(() => {});
  }, []);

  // Timer to rotate highlight items every 4.5 seconds
  useEffect(() => {
    if (isCardHovered) return;
    const timer = setInterval(() => {
      setRotateStep((s) => s + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, [isCardHovered]);

  // 1-second debounce after typing stops before submitting/filtering search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    fetchLeaderboard(mode, deviceFilter);
    setCurrentPage(1); // Reset page on mode or device change
  }, [mode, deviceFilter]);

  const fetchLeaderboard = async (currentMode: string, currentDevice: string = 'ALL') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?mode=${currentMode}&device=${currentDevice}`);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Keep true ranking based on full device/mode list
  const validLeaderboard = useMemo(() => {
    return (leaderboard || []).filter((item) => {
      if (mode === 'CREATOR') return true;
      const pts = mode === 'PLATFORMER' ? item.platformerPp : mode === 'CHALLENGE' ? item.challengePp : item.classicPp;
      return (pts || 0) > 0.005;
    });
  }, [leaderboard, mode]);

  const rankedLeaderboard = useMemo(() => {
    return validLeaderboard.map((player, idx) => ({
      ...player,
      rank: idx + 1,
    }));
  }, [validLeaderboard]);

  const isSearching = debouncedSearch.trim().length > 0;

  const podiumPlayers = useMemo(() => {
    return rankedLeaderboard.slice(0, 5);
  }, [rankedLeaderboard]);

  const filtered = useMemo(() => {
    // When searching: search across all players (including top 5)
    // When not searching: skip top 5 as they are featured on the podium box
    const sourceList = isSearching ? rankedLeaderboard : rankedLeaderboard.slice(5);
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return sourceList;

    if (mode === 'CREATOR') {
      return sourceList.filter((item) => {
        const levelHit = (item.createdLevels || []).some((lvl: { name?: string }) =>
          String(lvl.name || '')
            .toLowerCase()
            .includes(q)
        );
        return (
          levelHit ||
          [item.displayName, item.gdUsername, item.username]
            .filter(Boolean)
            .some((name: string) => name.toLowerCase().includes(q))
        );
      });
    }

    return sourceList.filter((item) => {
      return [item.displayName, item.gdUsername, item.username]
        .filter(Boolean)
        .some((name: string) => name.toLowerCase().includes(q));
    });
  }, [rankedLeaderboard, debouncedSearch, isSearching, mode]);

  const deleteLegacyPlayer = (name: string) => {
    showConfirm(t('leaderboard.delete_legacy_confirm', { name }), async () => {
      const res = await fetch('/api/admin/legacy-players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('admin.action_fail'), 'error');
        return;
      }
      showToast(t('leaderboard.delete_legacy_ok', { n: data.deleted || 0 }), 'success');
      fetchLeaderboard(mode, deviceFilter);
    });
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner - Concise & Direct */}
      <section className="ui-card p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight ui-title">
            {t('leaderboard.title')}
          </h1>
        </div>

        {/* Quick Stats Cards with smooth rotational items */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
          onMouseEnter={() => setIsCardHovered(true)}
          onMouseLeave={() => setIsCardHovered(false)}
        >
          {/* Card 1: Top 1 Classic Demon / Top 1 Player Classic */}
          {(() => {
            const isPlayer = (rotateStep % 2) === 1;
            if (isPlayer) {
              const p = highlights?.topPlayer;
              const href = p?.username ? `/profile/${p.username}` : '#';
              return (
                <Link
                  key="card1-player"
                  href={href}
                  className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
                >
                  <div className="animate-card-fade-in space-y-0.5">
                    <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-500" /> {t('leaderboard.stats.top_classic_player')}
                    </div>
                    <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                      {p?.displayName || p?.gdUsername || p?.username || t('leaderboard.stats.no_data')}
                    </div>
                    <div className="text-[10px] ui-dim truncate">
                      {p ? `${Number(p.classicPp || 0).toFixed(2)} ${t('leaderboard.points')}` : '—'}
                    </div>
                  </div>
                </Link>
              );
            }
            const lvl = highlights?.topClassicLevel;
            const href = lvl ? levelPath(lvl) : '/levels';
            return (
              <Link
                key="card1-demon"
                href={href}
                className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
              >
                <div className="animate-card-fade-in space-y-0.5">
                  <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {t('leaderboard.stats.top_classic_demon')}
                  </div>
                  <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                    {lvl?.name || t('leaderboard.stats.no_data')}
                  </div>
                  <div className="text-[10px] ui-dim truncate">
                    {lvl?.creatorName
                      ? `${t('common.by')} ${lvl.creatorName}`
                      : lvl?.vnPlacement
                        ? `#${lvl.vnPlacement}`
                        : '—'}
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* Card 2: Top 1 Platformer Demon / Top 1 Player Platformer */}
          {(() => {
            const isPlayer = (rotateStep % 2) === 1;
            if (isPlayer) {
              const p = highlights?.topPlatformerPlayer;
              const href = p?.username ? `/profile/${p.username}` : '#';
              return (
                <Link
                  key="card2-player"
                  href={href}
                  className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
                >
                  <div className="animate-card-fade-in space-y-0.5">
                    <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3 text-sky-500" /> {t('leaderboard.stats.top_plat_player')}
                    </div>
                    <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                      {p?.displayName || p?.gdUsername || p?.username || t('leaderboard.stats.no_data')}
                    </div>
                    <div className="text-[10px] ui-dim truncate">
                      {p ? `${Number(p.platformerPp || 0).toFixed(2)} ${t('leaderboard.points')}` : '—'}
                    </div>
                  </div>
                </Link>
              );
            }
            const lvl = highlights?.topPlatformerLevel;
            const href = lvl ? levelPath(lvl) : '/levels';
            return (
              <Link
                key="card2-demon"
                href={href}
                className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
              >
                <div className="animate-card-fade-in space-y-0.5">
                  <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                    <Moon className="w-3 h-3 text-sky-500 fill-sky-500 -rotate-12" /> {t('leaderboard.stats.top_plat_demon')}
                  </div>
                  <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                    {lvl?.name || t('leaderboard.stats.no_data')}
                  </div>
                  <div className="text-[10px] ui-dim truncate">
                    {lvl?.creatorName
                      ? `${t('common.by')} ${lvl.creatorName}`
                      : lvl
                        ? t('leaderboard.speedrun')
                        : '—'}
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* Card 3: Clan with highest score (cycling 5 categories) */}
          {(() => {
            const clanPhase = rotateStep % 5;
            const clanConfigs = [
              {
                key: 'clan-classic',
                icon: <Swords className="w-3 h-3 text-rose-500" />,
                title: t('leaderboard.stats.clan_classic'),
                data: highlights?.topClans?.classic,
                formatVal: (val: number) => `${Number(val || 0).toFixed(2)} Classic PP`,
              },
              {
                key: 'clan-platformer',
                icon: <Gamepad2 className="w-3 h-3 text-violet-500" />,
                title: t('leaderboard.stats.clan_plat'),
                data: highlights?.topClans?.platformer,
                formatVal: (val: number) => `${Number(val || 0).toFixed(2)} Plat PP`,
              },
              {
                key: 'clan-creator',
                icon: <Wrench className="w-3 h-3 text-teal-500" />,
                title: t('leaderboard.stats.clan_creator'),
                data: highlights?.topClans?.creator,
                formatVal: (val: number) => `${formatCp(val || 0)} CP`,
              },
              {
                key: 'clan-sp',
                icon: <Star className="w-3 h-3 text-amber-500" />,
                title: t('leaderboard.stats.clan_sp'),
                data: highlights?.topClans?.sp,
                formatVal: (val: number) => `${Number(val || 0).toLocaleString()} SP Coin`,
              },
              {
                key: 'clan-members',
                icon: <User className="w-3 h-3 text-indigo-500" />,
                title: t('leaderboard.stats.clan_members'),
                data: highlights?.topClans?.members,
                formatVal: (val: number) => t('leaderboard.stats.members_count', { n: val || 0 }),
              },
            ];

            const current = clanConfigs[clanPhase];
            const clanInfo = current.data?.clan;
            const href = clanInfo?.slug ? `/clan/${clanInfo.slug}` : '/clan';
            const displayName = clanInfo?.name ? `[${clanInfo.tag}] ${clanInfo.name}` : t('leaderboard.stats.no_data');

            return (
              <Link
                key={current.key}
                href={href}
                className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
              >
                <div className="animate-card-fade-in space-y-0.5">
                  <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                    {current.icon} {current.title}
                  </div>
                  <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] ui-dim truncate">
                    {clanInfo ? current.formatVal(current.data?.value) : '—'}
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* Card 4: Top 1 Creator / Top 1 Supporter */}
          {(() => {
            const isSupporter = (rotateStep % 2) === 1;
            if (isSupporter) {
              const s = highlights?.topSupporter;
              const href = s?.username ? `/profile/${s.username}` : '#';
              return (
                <Link
                  key="card4-supporter"
                  href={href}
                  className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
                >
                  <div className="animate-card-fade-in space-y-0.5">
                    <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                      <Heart className="w-3 h-3 text-pink-500 fill-pink-500" /> {t('leaderboard.stats.top_supporter')}
                    </div>
                    <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                      {s?.displayName || s?.gdUsername || s?.username || t('leaderboard.stats.no_data')}
                    </div>
                    <div className="text-[10px] ui-dim truncate">
                      {s ? t('leaderboard.stats.donated_months', { n: s.totalMonths }) : '—'}
                    </div>
                  </div>
                </Link>
              );
            }
            const c = highlights?.topCreator;
            const href = c?.username ? `/profile/${c.username}` : '#';
            return (
              <Link
                key="card4-creator"
                href={href}
                className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
              >
                <div className="animate-card-fade-in space-y-0.5">
                  <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-emerald-500" /> {t('leaderboard.stats.top1_creator')}
                  </div>
                  <div className="text-base font-extrabold ui-title mt-0.5 truncate">
                    {c?.displayName || c?.gdUsername || c?.username || t('leaderboard.stats.no_data')}
                  </div>
                  <div className="text-[10px] ui-dim truncate">
                    {c ? `${formatCp(c.creatorPoints)} CP` : '—'}
                  </div>
                </div>
              </Link>
            );
          })()}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <AnimatedTabs
          active={mode}
          onChange={setMode}
          options={[
            { id: 'CLASSIC', label: t('leaderboard.classic'), icon: <Star className="w-3.5 h-3.5 fill-current" /> },
            { id: 'PLATFORMER', label: t('leaderboard.platformer'), icon: <Gamepad2 className="w-3.5 h-3.5" /> },
            { id: 'CHALLENGE', label: t('tags.challenge'), icon: <Crosshair className="w-3.5 h-3.5" /> },
            { id: 'CREATOR', label: t('leaderboard.creator'), icon: <Wrench className="w-3.5 h-3.5" /> }
          ]}
        />

        {/* Device Filter (Hidden in CREATOR mode) */}
        {mode !== 'CREATOR' && (
          <div className="flex items-center gap-1 p-1 rounded-2xl border shrink-0" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
            <button
              onClick={() => setDeviceFilter('ALL')}
              className="px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: deviceFilter === 'ALL' ? 'var(--bg-card)' : 'transparent',
                color: deviceFilter === 'ALL' ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: deviceFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Tất cả
            </button>
            <button
              onClick={() => setDeviceFilter('PC')}
              className="px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: deviceFilter === 'PC' ? 'var(--bg-card)' : 'transparent',
                color: deviceFilter === 'PC' ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: deviceFilter === 'PC' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              PC
            </button>
            <button
              onClick={() => setDeviceFilter('MOBILE')}
              className="px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: deviceFilter === 'MOBILE' ? 'var(--bg-card)' : 'transparent',
                color: deviceFilter === 'MOBILE' ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: deviceFilter === 'MOBILE' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Mobile
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative min-w-60">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchInput !== debouncedSearch ? 'text-sky-500 animate-pulse' : 'ui-dim'}`} />
          <input
            type="text"
            placeholder={t('leaderboard.search_player')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs border focus:outline-none transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ui-dim cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top 5 Podium (Hidden when searching) */}
      {!isSearching && !loading && podiumPlayers.length > 0 && (
        <LeaderboardPodium players={podiumPlayers} mode={mode} />
      )}

      {/* Leaderboard Table Card */}
      {(!isSearching && rankedLeaderboard.length <= 5 && !loading) ? null : (
        <div className="ui-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center ui-dim text-xs font-medium">{t('leaderboard.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center ui-dim text-xs font-medium space-y-1">
              <div>{t('leaderboard.empty')}</div>
              <div className="text-[11px]">{t('leaderboard.empty_hint')}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                    <th className="px-5 py-3 w-14 text-center">{t('leaderboard.rank')}</th>
                    <th className="px-5 py-3">{t('leaderboard.player')}</th>
                    {mode === 'CREATOR' ? (
                      <>
                        <th className="px-5 py-3">{t('leaderboard.created_levels')}</th>
                        <th className="px-5 py-3">{t('leaderboard.tier')}</th>
                        <th className="px-5 py-3 text-right">{t('leaderboard.creator_points')}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-5 py-3">{t('leaderboard.hardest')}</th>
                        <th className="px-5 py-3 text-right">{mode === 'CLASSIC' ? t('leaderboard.classic') : t('leaderboard.platformer')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="ui-zebra">
                  {paginatedData.map((player) => {
                    const rank = player.rank;
                    const hardest = player.hardestLevel;
                    const displayName = player.displayName || player.gdUsername || player.username || '?';
                    const profileHref = player.username ? `/profile/${player.username}` : null;

                    const goProfile = () => {
                      if (profileHref) router.push(profileHref);
                    };
                    const onRowKey = (e: React.KeyboardEvent) => {
                      if (!profileHref) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goProfile();
                      }
                    };

                    const customRow = getUserListRowStyle(player, isDark);

                    return (
                      <tr
                        key={player.id}
                        role={profileHref ? 'link' : undefined}
                        tabIndex={profileHref ? 0 : undefined}
                        onClick={profileHref ? goProfile : undefined}
                        onKeyDown={onRowKey}
                        className={`transition-colors ${customRow.hasCustomBg ? 'hover:brightness-110 shadow-xs' : 'hover:opacity-90'} ${profileHref ? 'cursor-pointer' : ''}`}
                        style={customRow.style}
                      >
                        <td className="px-5 py-3.5 text-center" style={{ borderLeft: customRow.hasCustomBg ? `4px solid ${customRow.color}` : undefined }}>
                          <span className="font-extrabold text-xs" style={{ color: rank <= 3 ? 'var(--accent)' : customRow.hasCustomBg ? '#e2e8f0' : 'var(--text-dim)' }}>
                            #{rank}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-xl object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-[color:var(--accent-fg)]" style={{ backgroundColor: 'var(--accent)' }}>
                                {displayName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold ui-title flex items-center gap-1.5 flex-wrap">
                                <UserDisplayName user={player} fallbackName={displayName} linkClan />
                                
                                {/* Top Badges */}
                                {player.topBadges && player.topBadges.length > 0 && (
                                  <div className="flex items-center gap-1 ml-1">
                                    {player.topBadges
                                      .filter((ub: any) => ub.id !== 'role-super-admin' || isStaff)
                                      .slice(0, 3)
                                      .map((ub: any) => (
                                      <div 
                                        key={ub.id}
                                        className="flex items-center justify-center rounded-full"
                                        style={{
                                          width: '18px', height: '18px',
                                          backgroundColor: ub.bgColor || 'transparent',
                                          color: ub.color || '#fff',
                                          border: ub.borderColor ? `1px solid ${ub.borderColor}` : 'none',
                                          boxShadow: ub.glowColor ? (typeof ub.glowColor === 'string' ? `0 0 5px ${ub.glowColor}` : `0 0 5px ${ub.color || '#fff'}`) : 'none'
                                        }}
                                        title={ub.name + (ub.description ? `: ${ub.description}` : '')}
                                      >
                                        <BadgeIcon icon={ub.icon} className="w-2.5 h-2.5" color={ub.color || '#fff'} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {player.isLegacy && (
                                  <span className="text-[9px] font-bold uppercase ui-dim">{t('levelslist.unclaimed')}</span>
                                )}
                                {player.isLegacy && isStaff && (
                                  <button
                                    type="button"
                                    title={t('leaderboard.delete_legacy')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLegacyPlayer(displayName);
                                    }}
                                    className="p-0.5 rounded hover:bg-red-500/15 text-red-500"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className={`text-[10px] ${customRow.hasCustomBg ? 'text-slate-300' : 'ui-dim'}`}>{player.isLegacy ? '—' : (player.country || t('common.vietnam'))}</div>
                            </div>
                          </div>
                        </td>

                        {mode === 'CREATOR' ? (
                          <>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col gap-1 min-w-40">
                                {(player.unverified || player.isLegacy || player.gdVerified === false) && (
                                  <span
                                    className="self-start px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase"
                                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}
                                  >
                                    {t('leaderboard.unverified')}
                                  </span>
                                )}
                                {player.createdLevels?.length ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link
                                      href={levelPath(player.createdLevels[0])}
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:underline"
                                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}
                                    >
                                      {player.createdLevels[0].name}
                                    </Link>
                                    {player.createdLevels.length > 1 && (
                                      <span className="text-[10px] font-bold ui-dim">
                                        +{player.createdLevels.length - 1}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] ui-dim italic">{t('leaderboard.no_levels')}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              {player.qualityBadges?.deco || player.qualityBadges?.layout ? (
                                <div className="flex items-center gap-1.5">
                                  {[player.qualityBadges.deco, player.qualityBadges.layout].filter(Boolean).map((badge: any) => (
                                    <BadgeIcon
                                      key={badge.id}
                                      icon={badge.icon || 'Star'}
                                      color={badge.color}
                                      glow={badge.glowColor}
                                      className="w-5 h-5"
                                      title={badge.name}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] ui-dim italic">{t('leaderboard.no_quality')}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-sm" style={{ color: customRow.hasCustomBg ? '#38bdf8' : 'var(--accent)' }}>
                              {formatCp(player.creatorPoints)} <span className={`text-[10px] font-normal ${customRow.hasCustomBg ? 'text-slate-300' : 'ui-dim'}`}>CP</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3.5">
                              {hardest ? (
                                <Link
                                  href={levelPath(hardest)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 hover:underline"
                                >
                                  {hardest.placement != null && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}>
                                      #{hardest.placement}
                                    </span>
                                  )}
                                  <span className={`font-medium ${customRow.hasCustomBg ? 'text-slate-100 font-bold' : 'ui-title'}`}>{hardest.name}</span>
                                </Link>
                              ) : (
                                <span className="text-[11px] ui-dim italic">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-sm" style={{ color: customRow.hasCustomBg ? '#38bdf8' : 'var(--accent)' }}>
                              {(mode === 'PLATFORMER' ? (player.platformerPp || 0) : mode === 'CHALLENGE' ? (player.challengePp || 0) : (player.classicPp || 0)).toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {filtered.length > pageSize && (
        <FloatingNav 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
