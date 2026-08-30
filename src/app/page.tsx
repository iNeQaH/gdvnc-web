'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Moon, Wrench, Search, CheckCircle2, User, Trash2 } from 'lucide-react';
import * as AllLucideIcons from 'lucide-react';
import { CUSTOM_ICONS } from '@/components/CustomIcons';
import { useLanguage } from '@/components/LanguageContext';
import { formatCp } from '@/lib/creatorPoints';
import { levelPath } from '@/lib/levelUrl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/GlobalToast';

import FloatingNav from '@/components/FloatingNav';

const IconRender = ({ icon, className }: { icon: string; className?: string }) => {
  const Comp = (CUSTOM_ICONS as any)[icon] || (AllLucideIcons as any)[icon] || AllLucideIcons.Star;
  return <Comp className={className} />;
};

export default function HomePage() {
  const { t } = useLanguage();
  const { showConfirm, showToast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<'CLASSIC' | 'PLATFORMER' | 'CREATOR'>('CLASSIC');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
    fetchLeaderboard(mode);
    setCurrentPage(1); // Reset page on mode change

    // Dynamically update favicon based on selected mode
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (favicon) {
      if (mode === 'CLASSIC') {
        favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23eab308'><polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26'/></svg>`;
      } else if (mode === 'PLATFORMER') {
        favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2338bdf8' transform='rotate(-15)'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/></svg>`;
      } else {
        favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/></svg>`;
      }
    }
  }, [mode]);

  useEffect(() => {
    fetch('/api/leaderboard/highlights')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHighlights(data.highlights);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchLeaderboard = async (currentMode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?mode=${currentMode}`);
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

  const filtered = leaderboard.filter((item) => {
    const pts =
      mode === 'CREATOR' ? item.creatorPoints : mode === 'PLATFORMER' ? item.platformerPp : item.classicPp;
    if (!(pts > 0.005)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return [item.displayName, item.gdUsername, item.username]
      .filter(Boolean)
      .some((name: string) => name.toLowerCase().includes(q));
  });

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
      fetchLeaderboard(mode);
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
          <p className="text-xs sm:text-sm ui-dim max-w-2xl leading-relaxed">
            {t('leaderboard.desc')}
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <Link
            href={highlights?.topClassicLevel ? levelPath(highlights.topClassicLevel) : '/levels'}
            className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
          >
            <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {t('leaderboard.stats.top1_classic')}
            </div>
            <div className="text-base font-extrabold ui-title mt-0.5 truncate">
              {highlights?.topClassicLevel?.name || t('leaderboard.stats.no_data')}
            </div>
            <div className="text-[10px] ui-dim">
              {highlights?.topClassicLevel
                ? `${Number(highlights.topClassicLevel.basePp || 0).toFixed(2)} ${t('leaderboard.points')}`
                : '—'}
            </div>
          </Link>
          <Link
            href={highlights?.topPlatformerLevel ? levelPath(highlights.topPlatformerLevel) : '/levels'}
            className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
          >
            <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
              <Moon className="w-3 h-3 text-sky-500 fill-sky-500 -rotate-12" /> {t('leaderboard.stats.top1_plat')}
            </div>
            <div className="text-base font-extrabold ui-title mt-0.5 truncate">
              {highlights?.topPlatformerLevel?.name || t('leaderboard.stats.no_data')}
            </div>
            <div className="text-[10px] ui-dim">{t('leaderboard.speedrun')}</div>
          </Link>
          {highlights?.topPlayer?.username ? (
          <Link
            href={`/profile/${highlights.topPlayer.username}`}
            className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
          >
            <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
              <User className="w-3 h-3" /> {t('leaderboard.stats.top1_player')}
            </div>
            <div className="text-base font-extrabold ui-title mt-0.5 truncate">
              {highlights.topPlayer.displayName || highlights.topPlayer.gdUsername || highlights.topPlayer.username}
            </div>
            <div className="text-[10px] ui-dim">
              {`${Number(highlights.topPlayer.classicPp || 0).toFixed(2)} ${t('leaderboard.points')}`}
            </div>
          </Link>
          ) : (
          <div className="ui-subtle p-3.5 rounded-xl">
            <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
              <User className="w-3 h-3" /> {t('leaderboard.stats.top1_player')}
            </div>
            <div className="text-base font-extrabold ui-title mt-0.5 truncate">
              {highlights?.topPlayer?.displayName || highlights?.topPlayer?.gdUsername || t('leaderboard.stats.no_data')}
            </div>
            <div className="text-[10px] ui-dim">
              {highlights?.topPlayer
                ? `${Number(highlights.topPlayer.classicPp || 0).toFixed(2)} ${t('leaderboard.points')}`
                : '—'}
            </div>
          </div>
          )}
          <Link
            href={highlights?.topCreator ? `/profile/${highlights.topCreator.username}` : '#'}
            className="ui-subtle p-3.5 rounded-xl block hover:opacity-90 transition-opacity"
          >
            <div className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1">
              <Wrench className="w-3 h-3" /> {t('leaderboard.stats.top1_creator')}
            </div>
            <div className="text-base font-extrabold ui-title mt-0.5 truncate">
              {highlights?.topCreator?.displayName || highlights?.topCreator?.gdUsername || highlights?.topCreator?.username || t('leaderboard.stats.no_data')}
            </div>
            <div className="text-[10px] ui-dim">
              {highlights?.topCreator
                ? `${formatCp(highlights.topCreator.creatorPoints)} CP`
                : '—'}
            </div>
          </Link>
        </div>
      </section>

      {/* Mode Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
          <button
            onClick={() => setMode('CLASSIC')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: mode === 'CLASSIC' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'CLASSIC' ? 'var(--accent)' : 'var(--text-dim)',
              boxShadow: mode === 'CLASSIC' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            {t('leaderboard.classic')}
          </button>
          <button
            onClick={() => setMode('PLATFORMER')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: mode === 'PLATFORMER' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'PLATFORMER' ? 'var(--accent)' : 'var(--text-dim)',
              boxShadow: mode === 'PLATFORMER' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <Moon className="w-3.5 h-3.5 fill-current -rotate-12" />
            {t('leaderboard.platformer')}
          </button>
          <button
            onClick={() => setMode('CREATOR')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: mode === 'CREATOR' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'CREATOR' ? 'var(--accent)' : 'var(--text-dim)',
              boxShadow: mode === 'CREATOR' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <Wrench className="w-3.5 h-3.5" />
            {t('leaderboard.creator')}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-60">
          <Search className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('leaderboard.search_player')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
          />
        </div>
      </div>

      {/* Leaderboard Table Card */}
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
                {paginatedData.map((player, index) => {
                  const rank = (currentPage - 1) * pageSize + index + 1;
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

                  return (
                    <tr
                      key={player.id}
                      role={profileHref ? 'link' : undefined}
                      tabIndex={profileHref ? 0 : undefined}
                      onClick={profileHref ? goProfile : undefined}
                      onKeyDown={onRowKey}
                      className={`transition-colors hover:opacity-90 ${profileHref ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-extrabold text-xs" style={{ color: rank <= 3 ? 'var(--accent)' : 'var(--text-dim)' }}>
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
                            <div className="font-bold ui-title flex items-center gap-1.5">
                              {displayName}
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
                              {player.role === 'ADMIN' && (
                                <span className="px-1 py-0.2 text-[9px] font-extrabold uppercase rounded" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                  Admin
                                </span>
                              )}
                              {player.supporterUntil && new Date(player.supporterUntil) > new Date() && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                                  Supporter
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] ui-dim">{player.isLegacy ? '—' : (player.country || t('common.vietnam'))}</div>
                          </div>
                        </div>
                      </td>

                      {mode === 'CREATOR' ? (
                        <>
                          <td className="px-5 py-3.5">
                            {player.qualityBadges?.deco || player.qualityBadges?.layout ? (
                              <div className="flex items-center gap-1.5">
                                {[player.qualityBadges.deco, player.qualityBadges.layout].filter(Boolean).map((badge: any) => (
                                  <span
                                    key={badge.id}
                                    title={badge.name}
                                    className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm"
                                    style={{
                                      backgroundColor: badge.color || 'var(--accent)',
                                      color: '#fff',
                                      boxShadow: badge.glowColor ? `0 0 8px ${badge.color}` : 'none',
                                    }}
                                  >
                                    <IconRender icon={badge.icon || 'Star'} className="w-3.5 h-3.5" />
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] ui-dim italic">{t('leaderboard.no_quality')}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-sm" style={{ color: 'var(--accent)' }}>
                            {formatCp(player.creatorPoints)} <span className="text-[10px] font-normal ui-dim">CP</span>
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
                                <span className="font-medium ui-title">{hardest.name}</span>
                              </Link>
                            ) : (
                              <span className="text-[11px] ui-dim italic">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-sm" style={{ color: 'var(--accent)' }}>
                            {(mode === 'CLASSIC' ? (player.classicPp || 0) : (player.platformerPp || 0)).toFixed(2)}
                            <span className="text-[10px] font-normal ui-dim ml-1">Points</span>
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

      <FloatingNav 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
