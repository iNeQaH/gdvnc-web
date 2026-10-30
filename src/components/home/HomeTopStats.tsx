'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Star, Moon, Wrench, Gamepad2, User, Crosshair, 
  Heart, Flame, Sparkles, Coins, Trophy 
} from 'lucide-react';
import { levelPath } from '@/lib/levelUrl';
import { formatCp } from '@/lib/creatorPoints';

interface HighlightProps {
  highlights?: any;
  isLavender?: boolean;
  isDark?: boolean;
}

export function HomeTopStats({
  highlights,
}: HighlightProps) {
  const pClassic = highlights?.topPlayer;
  const pPlat = highlights?.topPlatformerPlayer;
  const lvlFeature = highlights?.topFeaturedLevel;
  const lvlClassic = highlights?.topClassicLevel;
  const lvlChallenge = highlights?.topChallengeLevel;
  const pStar = highlights?.topStarPlayer;
  const pMoon = highlights?.topMoonPlayer;
  const pDemon = highlights?.topDemonPlayer;
  const clanActivity = highlights?.topActivityClan;
  const clanSp = highlights?.topSpClan;
  const creator = highlights?.topCreator;
  const supporter = highlights?.topSupporter;

  const cards = [
    // --- ROW 1: TOP COMPETITIVE & CORE LISTS ---
    {
      title: 'Top 1 Player Classic',
      icon: <User className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-amber-400/80 dark:border-amber-500/35 hover:border-amber-500',
      bgClass: 'bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40',
      hoverText: 'group-hover:text-amber-500 dark:group-hover:text-amber-300',
      detailClass: 'text-amber-800 dark:text-amber-200/90',
      glowColor: 'rgba(245, 158, 11, 0.85)',
      glowBorder: 'rgba(245, 158, 11, 0.85)',
      glowRadius: '26px',
      breatheDuration: '3.6s',
      breatheDelay: '0.2s',
      hueDuration: '8s',
      hueDelay: '0s',
      name: pClassic?.displayName || pClassic?.username || '—',
      detail: pClassic ? `${Number(pClassic.classicPp || 0).toFixed(2)} Điểm số` : '—',
      href: pClassic?.username ? `/profile/${pClassic.username}` : '#',
    },
    {
      title: 'Top 1 Player Platformer',
      icon: <Gamepad2 className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-sky-400/80 dark:border-sky-500/35 hover:border-sky-500',
      bgClass: 'bg-gradient-to-br from-sky-500/10 via-card to-card dark:from-sky-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/25 dark:text-sky-300 dark:border-sky-500/40',
      hoverText: 'group-hover:text-sky-500 dark:group-hover:text-sky-300',
      detailClass: 'text-sky-800 dark:text-sky-200/90',
      glowColor: 'rgba(14, 165, 233, 0.65)',
      glowBorder: 'rgba(14, 165, 233, 0.75)',
      glowRadius: '18px',
      breatheDuration: '4.5s',
      breatheDelay: '1.8s',
      hueDuration: '9.5s',
      hueDelay: '1.2s',
      name: pPlat?.displayName || pPlat?.username || '—',
      detail: pPlat ? `${Number(pPlat.platformerPp || 0).toFixed(2)} Điểm số` : '—',
      href: pPlat?.username ? `/profile/${pPlat.username}` : '#',
    },
    {
      title: 'Top 1 Classic List',
      icon: <Trophy className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-amber-400/80 dark:border-amber-500/35 hover:border-amber-500',
      bgClass: 'bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40',
      hoverText: 'group-hover:text-amber-500 dark:group-hover:text-amber-300',
      detailClass: 'text-amber-800 dark:text-amber-200/90',
      glowColor: 'rgba(245, 158, 11, 0.75)',
      glowBorder: 'rgba(245, 158, 11, 0.8)',
      glowRadius: '22px',
      breatheDuration: '3.2s',
      breatheDelay: '0.8s',
      hueDuration: '7.5s',
      hueDelay: '2.4s',
      name: lvlClassic?.name || '—',
      detail: lvlClassic?.creatorName ? `by ${lvlClassic.creatorName}` : '#1 Classic',
      href: lvlClassic ? levelPath(lvlClassic) : '/levels/classic',
    },
    {
      title: 'Top 1 Feature List',
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-orange-400/80 dark:border-orange-500/35 hover:border-orange-500',
      bgClass: 'bg-gradient-to-br from-orange-500/10 via-card to-card dark:from-orange-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-500/25 dark:text-orange-300 dark:border-orange-500/40',
      hoverText: 'group-hover:text-orange-500 dark:group-hover:text-orange-300',
      detailClass: 'text-orange-800 dark:text-orange-200/90',
      glowColor: 'rgba(249, 115, 22, 0.90)',
      glowBorder: 'rgba(249, 115, 22, 0.9)',
      glowRadius: '28px',
      breatheDuration: '4.8s',
      breatheDelay: '2.5s',
      hueDuration: '10s',
      hueDelay: '0.5s',
      name: lvlFeature?.name || '—',
      detail: lvlFeature?.creatorName ? `by ${lvlFeature.creatorName}` : '#1 Featured',
      href: lvlFeature ? levelPath(lvlFeature) : '/levels/featured',
    },

    // --- ROW 2: CHALLENGE & GD STATS ---
    {
      title: 'Top 1 Challenge List',
      icon: <Crosshair className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-purple-400/80 dark:border-purple-500/35 hover:border-purple-500',
      bgClass: 'bg-gradient-to-br from-purple-500/10 via-card to-card dark:from-purple-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/25 dark:text-purple-300 dark:border-purple-500/40',
      hoverText: 'group-hover:text-purple-500 dark:group-hover:text-purple-300',
      detailClass: 'text-purple-800 dark:text-purple-200/90',
      glowColor: 'rgba(168, 85, 247, 0.70)',
      glowBorder: 'rgba(168, 85, 247, 0.8)',
      glowRadius: '20px',
      breatheDuration: '3.9s',
      breatheDelay: '1.1s',
      hueDuration: '8.5s',
      hueDelay: '1.8s',
      name: lvlChallenge?.name || '—',
      detail: lvlChallenge?.creatorName ? `by ${lvlChallenge.creatorName}` : '#1 Challenge',
      href: lvlChallenge ? levelPath(lvlChallenge) : '/levels/challenge',
    },
    {
      title: 'Top 1 Stars Grinder',
      icon: <Star className="w-3.5 h-3.5 shrink-0 fill-current" />,
      borderClass: 'border-yellow-400/80 dark:border-yellow-500/35 hover:border-yellow-500',
      bgClass: 'bg-gradient-to-br from-yellow-500/10 via-card to-card dark:from-yellow-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-yellow-100 text-yellow-950 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-300 dark:border-yellow-500/40',
      hoverText: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-300',
      detailClass: 'text-yellow-900 dark:text-yellow-200/90',
      glowColor: 'rgba(234, 179, 8, 0.85)',
      glowBorder: 'rgba(234, 179, 8, 0.85)',
      glowRadius: '24px',
      breatheDuration: '4.1s',
      breatheDelay: '0.5s',
      hueDuration: '9s',
      hueDelay: '3s',
      name: pStar?.displayName || pStar?.username || '—',
      detail: pStar?.gdStars ? `${Number(pStar.gdStars).toLocaleString()} Stars` : '—',
      href: pStar?.username ? `/profile/${pStar.username}` : '#',
    },
    {
      title: 'Top 1 Moons Grinder',
      icon: <Moon className="w-3.5 h-3.5 shrink-0 fill-current" />,
      borderClass: 'border-cyan-400/80 dark:border-cyan-500/35 hover:border-cyan-500',
      bgClass: 'bg-gradient-to-br from-cyan-500/10 via-card to-card dark:from-cyan-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-500/25 dark:text-cyan-300 dark:border-cyan-500/40',
      hoverText: 'group-hover:text-cyan-500 dark:group-hover:text-cyan-300',
      detailClass: 'text-cyan-800 dark:text-cyan-200/90',
      glowColor: 'rgba(6, 182, 212, 0.60)',
      glowBorder: 'rgba(6, 182, 212, 0.75)',
      glowRadius: '16px',
      breatheDuration: '3.4s',
      breatheDelay: '2.7s',
      hueDuration: '7.8s',
      hueDelay: '0.9s',
      name: pMoon?.displayName || pMoon?.username || '—',
      detail: pMoon?.gdMoons ? `${Number(pMoon.gdMoons).toLocaleString()} Moons` : '—',
      href: pMoon?.username ? `/profile/${pMoon.username}` : '#',
    },
    {
      title: 'Top 1 Demons Grinder',
      icon: <Flame className="w-3.5 h-3.5 shrink-0 fill-current" />,
      borderClass: 'border-rose-400/80 dark:border-rose-500/35 hover:border-rose-500',
      bgClass: 'bg-gradient-to-br from-rose-500/10 via-card to-card dark:from-rose-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40',
      hoverText: 'group-hover:text-rose-500 dark:group-hover:text-rose-300',
      detailClass: 'text-rose-800 dark:text-rose-200/90',
      glowColor: 'rgba(244, 63, 94, 0.95)',
      glowBorder: 'rgba(244, 63, 94, 0.95)',
      glowRadius: '28px',
      breatheDuration: '4.6s',
      breatheDelay: '1.4s',
      hueDuration: '10.5s',
      hueDelay: '2.1s',
      name: pDemon?.displayName || pDemon?.username || '—',
      detail: pDemon?.gdDemons ? `${Number(pDemon.gdDemons).toLocaleString()} Demons` : '—',
      href: pDemon?.username ? `/profile/${pDemon.username}` : '#',
    },

    // --- ROW 3: CLANS & COMMUNITY ---
    {
      title: 'Clan Hoạt Động cao nhất',
      icon: <Flame className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-emerald-400/80 dark:border-emerald-500/35 hover:border-emerald-500',
      bgClass: 'bg-gradient-to-br from-emerald-500/10 via-card to-card dark:from-emerald-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40',
      hoverText: 'group-hover:text-emerald-500 dark:group-hover:text-emerald-300',
      detailClass: 'text-emerald-800 dark:text-emerald-200/90',
      glowColor: 'rgba(16, 185, 129, 0.75)',
      glowBorder: 'rgba(16, 185, 129, 0.8)',
      glowRadius: '22px',
      breatheDuration: '3.3s',
      breatheDelay: '0.9s',
      hueDuration: '8.2s',
      hueDelay: '1.5s',
      name: clanActivity ? `[${clanActivity.tag}] ${clanActivity.name}` : '—',
      detail: clanActivity ? `${clanActivity.totalActivityPoints || 0} Điểm hôm nay` : '—',
      href: clanActivity?.slug ? `/clan/${clanActivity.slug}` : '#',
    },
    {
      title: 'Clan SP cao nhất',
      icon: <Coins className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-indigo-400/80 dark:border-indigo-500/35 hover:border-indigo-500',
      bgClass: 'bg-gradient-to-br from-indigo-500/10 via-card to-card dark:from-indigo-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-300 dark:border-indigo-500/40',
      hoverText: 'group-hover:text-indigo-500 dark:group-hover:text-indigo-300',
      detailClass: 'text-indigo-800 dark:text-indigo-200/90',
      glowColor: 'rgba(99, 102, 241, 0.55)',
      glowBorder: 'rgba(99, 102, 241, 0.7)',
      glowRadius: '15px',
      breatheDuration: '4.4s',
      breatheDelay: '2.2s',
      hueDuration: '9.2s',
      hueDelay: '0.3s',
      name: clanSp ? `[${clanSp.tag}] ${clanSp.name}` : '—',
      detail: clanSp ? `${clanSp.totalSp || 0} SP Coin` : '—',
      href: clanSp?.slug ? `/clan/${clanSp.slug}` : '#',
    },
    {
      title: 'Top 1 Creator',
      icon: <Wrench className="w-3.5 h-3.5 shrink-0" />,
      borderClass: 'border-fuchsia-400/80 dark:border-fuchsia-500/35 hover:border-fuchsia-500',
      bgClass: 'bg-gradient-to-br from-fuchsia-500/10 via-card to-card dark:from-fuchsia-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-500/25 dark:text-fuchsia-300 dark:border-fuchsia-500/40',
      hoverText: 'group-hover:text-fuchsia-500 dark:group-hover:text-fuchsia-300',
      detailClass: 'text-fuchsia-800 dark:text-fuchsia-200/90',
      glowColor: 'rgba(217, 70, 239, 0.80)',
      glowBorder: 'rgba(217, 70, 239, 0.85)',
      glowRadius: '25px',
      breatheDuration: '3.7s',
      breatheDelay: '1.6s',
      hueDuration: '8.8s',
      hueDelay: '2.7s',
      name: creator ? (creator.displayName || creator.username) : '—',
      detail: creator ? formatCp(creator.creatorPoints || 0) : '—',
      href: creator?.username ? `/profile/${creator.username}` : '#',
    },
    {
      title: 'Top Supporter',
      icon: <Heart className="w-3.5 h-3.5 shrink-0 fill-current" />,
      borderClass: 'border-pink-400/80 dark:border-pink-500/35 hover:border-pink-500',
      bgClass: 'bg-gradient-to-br from-pink-500/10 via-card to-card dark:from-pink-500/20 dark:via-card/90 dark:to-card/60',
      badgeClass: 'bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-500/25 dark:text-pink-300 dark:border-pink-500/40',
      hoverText: 'group-hover:text-pink-500 dark:group-hover:text-pink-300',
      detailClass: 'text-pink-800 dark:text-pink-200/90',
      glowColor: 'rgba(236, 72, 153, 0.85)',
      glowBorder: 'rgba(236, 72, 153, 0.9)',
      glowRadius: '26px',
      breatheDuration: '4.0s',
      breatheDelay: '0.4s',
      hueDuration: '11s',
      hueDelay: '1.1s',
      name: supporter ? (supporter.displayName || supporter.username) : '—',
      detail: supporter?.supporterTotalMonths ? `${supporter.supporterTotalMonths} tháng đồng hành` : 'Hỗ trợ server',
      href: supporter?.username ? `/profile/${supporter.username}` : '#',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c, idx) => {
        const hasLink = c.href && c.href !== '#';
        const CardWrapper = hasLink ? Link : 'div';
        const wrapperProps = hasLink ? { href: c.href } : {};

        return (
          <CardWrapper
            key={idx}
            {...(wrapperProps as any)}
            className={`group relative rounded-2xl border ${c.borderClass} ${c.bgClass} p-3.5 sm:p-4 min-h-[96px] sm:min-h-[102px] flex flex-col justify-between select-none animate-card-breathe`}
            style={{
              // Asynchronous non-simultaneous fade in/out parameters
              ['--breathe-duration' as any]: c.breatheDuration,
              ['--breathe-delay' as any]: c.breatheDelay,
              ['--glow-color' as any]: c.glowColor,
              ['--glow-border' as any]: c.glowBorder,
              ['--glow-radius' as any]: c.glowRadius,
              ['--hue-duration' as any]: c.hueDuration,
              ['--hue-delay' as any]: c.hueDelay,
            }}
          >
            <div className="flex flex-col justify-between h-full space-y-2 relative z-10">
              {/* Category chip */}
              <div className="flex items-center">
                <span 
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-xs truncate transition-all ${c.badgeClass}`}
                >
                  {c.icon}
                  <span className="truncate">{c.title}</span>
                </span>
              </div>

              {/* Title & Detail */}
              <div className="space-y-0.5">
                <div className={`text-sm sm:text-base font-black truncate text-slate-900 dark:text-white drop-shadow-xs transition-colors ${c.hoverText}`}>
                  {c.name}
                </div>
                <div className={`text-[11px] truncate font-bold drop-shadow-xs transition-colors ${c.detailClass}`}>
                  {c.detail}
                </div>
              </div>
            </div>
          </CardWrapper>
        );
      })}
    </div>
  );
}

export default HomeTopStats;