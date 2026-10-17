'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  Coins,
  Crown,
  ShieldCheck,
  Settings,
  Heart,
  Video,
  Trophy,
  ExternalLink,
  UserPlus,
  LogOut,
  AlertTriangle,
  Loader2,
  X,
  Play,
  Hammer,
  ArrowRight,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit,
  Rocket,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { UserDisplayName } from '@/components/UserDisplayName';
import JoinClanModal from '@/components/clan/JoinClanModal';
import ClanDiscordMemberSidebar from '@/components/clan/ClanDiscordMemberSidebar';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';
import { useTheme } from '@/components/ThemeProvider';
import { getCustomThemeVars } from '@/lib/customTheme';
import { DifficultyRatingIcon } from '@/components/DifficultyRatingIcon';
import { levelPath } from '@/lib/levelUrl';
import { formatCp } from '@/lib/creatorPoints';

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

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

function parseDiscordMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const isQuote = line.startsWith('> ');
    const content = isQuote ? line.slice(2) : line;

    const parts: React.ReactNode[] = [];
    let keyCounter = 0;

    const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={keyCounter++}
            className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono text-xs border border-white/10"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={keyCounter++} className="font-extrabold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('__') && token.endsWith('__')) {
        parts.push(
          <u key={keyCounter++} className="underline underline-offset-2">
            {token.slice(2, -2)}
          </u>
        );
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        parts.push(
          <del key={keyCounter++} className="line-through opacity-70">
            {token.slice(2, -2)}
          </del>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={keyCounter++} className="italic text-slate-300">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('http://') || token.startsWith('https://')) {
        parts.push(
          <a
            key={keyCounter++}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline font-semibold break-all"
          >
            {token}
          </a>
        );
      } else {
        parts.push(token);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    if (isQuote) {
      return (
        <blockquote
          key={lineIdx}
          className="border-l-4 border-sky-500 pl-3 py-1 my-1 italic bg-sky-500/5 rounded-r-lg text-slate-300"
        >
          {parts}
        </blockquote>
      );
    }

    return (
      <p key={lineIdx} className={line === '' ? 'h-3' : 'min-h-[1.25rem] leading-relaxed'}>
        {parts}
      </p>
    );
  });
}

/**
 * Clan's Hardest Slideshow Component (interactive with embedded video and thumbnails)
 */
function ClanHardestSlideshow({
  topBeaten,
  isEn,
}: {
  topBeaten: any[];
  isEn?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [embedVideo, setEmbedVideo] = useState(false);

  if (!topBeaten || topBeaten.length === 0) {
    return (
      <div
        className="ui-card relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border shadow-xl flex flex-col items-center justify-center p-6 text-center space-y-3"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
      >
        <Trophy className="w-10 h-10 ui-dim opacity-30" />
        <div>
          <h2 className="text-sm font-bold ui-title">Clan&apos;s Hardest</h2>
          <p className="text-xs ui-dim mt-1 max-w-xs">
            {isEn
              ? 'No demon records completed yet by clan members.'
              : 'Chưa có kỷ lục Demon nào được các thành viên trong Clan chinh phục.'}
          </p>
        </div>
      </div>
    );
  }

  const currentItem = topBeaten[currentIndex] || topBeaten[0];
  const lvl = currentItem.level;

  // Auto-advance every 5.5s
  useEffect(() => {
    if (topBeaten.length <= 1 || isHovered || embedVideo) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topBeaten.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [topBeaten.length, isHovered, embedVideo]);

  const handleSelectSlide = (idx: number) => {
    setEmbedVideo(false);
    setCurrentIndex(idx);
  };

  const handleNext = () => {
    setEmbedVideo(false);
    setCurrentIndex((prev) => (prev + 1) % topBeaten.length);
  };

  const handlePrev = () => {
    setEmbedVideo(false);
    setCurrentIndex((prev) => (prev - 1 + topBeaten.length) % topBeaten.length);
  };

  // Extract YouTube ID from record video or level video
  const videoSource = currentItem.videoUrl || lvl.videoUrl;
  const ytMatch = videoSource
    ? videoSource.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
    : null;
  const ytId = lvl.youtubeId || (ytMatch ? ytMatch[1] : null);

  const highResThumb = ytId
    ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    : 'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';

  const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1` : null;

  // Hạng thực tế của demon trong danh sách (không hiển thị nhầm là Top 1 Demon)
  const rankNumber = lvl.classicRank || lvl.placement || lvl.vnPlacement;
  const rankLabel = lvl.classicRank
    ? `#${lvl.classicRank}`
    : lvl.placement
    ? `#${lvl.placement}`
    : lvl.vnPlacement
    ? `#${lvl.vnPlacement} VN`
    : (isEn ? 'Unranked' : 'Chưa xếp hạng');

  return (
    <div
      className="ui-card relative w-full h-full rounded-2xl overflow-hidden border shadow-xl flex flex-col justify-between transition-all duration-300"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Row */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between gap-3 bg-black/5 dark:bg-black/15"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h2 className="text-sm font-bold ui-title">Clan&apos;s Hardest</h2>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            {topBeaten.length} {isEn ? 'Demons' : 'Demon'}
          </span>
        </div>

        {topBeaten.length > 1 && (
          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-black/40 text-amber-600 dark:text-amber-400 border border-black/10 dark:border-white/10">
            {String(currentIndex + 1).padStart(2, '0')} / {String(topBeaten.length).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Main Slide Canvas */}
      <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-4 sm:p-5 flex-1">
        {embedVideo && embedUrl ? (
          <div className="absolute inset-0 z-20 bg-black flex flex-col">
            <div className="p-2 bg-black/80 flex items-center justify-between border-b border-white/10 px-4">
              <span className="text-xs font-bold text-white truncate">{lvl.name}</span>
              <button
                type="button"
                onClick={() => setEmbedVideo(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isEn ? 'Close Video' : 'Đóng Video'}</span>
              </button>
            </div>
            <div className="flex-1 w-full h-full">
              <iframe
                src={embedUrl}
                title={lvl.name || 'Demon Video'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <>
            {/* Background Thumbnail */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                key={lvl.id || currentIndex}
                src={highResThumb}
                alt={lvl.name || ''}
                className="w-full h-full object-cover transition-all duration-700 ease-out"
                style={{ filter: 'brightness(0.45) contrast(1.15)' }}
                onError={(e) => {
                  if (ytId && (e.currentTarget as HTMLImageElement).src.includes('maxresdefault')) {
                    (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                  } else {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';
                  }
                }}
              />
            </div>

            {/* Vignette Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Top Badges */}
            <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-sm">
                  {rankLabel}
                </span>
                <DifficultyRatingIcon
                  difficultyFace={lvl.difficultyFace}
                  ratingType={lvl.ratingType}
                  className="w-7 h-7 drop-shadow-md"
                />
                <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-xl backdrop-blur-md">
                  {lvl.basePp || 0} Pt
                </span>
              </div>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-2 max-w-xl">
              <div>
                <Link
                  href={levelPath(lvl)}
                  className="text-lg sm:text-xl font-black text-white hover:text-amber-300 drop-shadow-md tracking-tight block transition-colors truncate"
                >
                  {lvl.name}
                </Link>

                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="ui-dim">{isEn ? 'Conquered by:' : 'Người chinh phục:'}</span>
                    <strong className="text-white font-bold">
                      <UserDisplayName user={currentItem.user} showClanTag={false} />
                    </strong>
                  </span>
                  {lvl.creatorName && (
                    <span className="flex items-center gap-1 border-l border-white/20 pl-2 ui-dim">
                      <span>{isEn ? 'by' : 'bởi'} {lvl.creatorName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                {ytId && (
                  <button
                    type="button"
                    onClick={() => setEmbedVideo(true)}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-sm hover:scale-105 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{isEn ? 'Watch Video' : 'Xem Video Ngay'}</span>
                  </button>
                )}

                <Link
                  href={levelPath(lvl)}
                  className="px-3 py-1 rounded-xl text-xs font-bold border border-white/20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center gap-1 transition-all"
                >
                  <span>{isEn ? 'Level Details' : 'Chi tiết màn chơi'}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Navigation Arrows */}
            {topBeaten.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-xl"
                  title={isEn ? 'Previous demon' : 'Demon trước'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-xl"
                  title={isEn ? 'Next demon' : 'Demon kế tiếp'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {topBeaten.length > 1 && (
              <div className="absolute bottom-2.5 right-4 flex items-center gap-1.5 z-20">
                {topBeaten.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === currentIndex
                        ? 'w-5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                        : 'w-1.5 bg-white/35 hover:bg-white/70'
                    }`}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

/**
 * Compact Featured Creator Works Slideshow Component (thấp hơn, bé nhất, dưới cùng)
 */
function CompactClanLevelsSlideshow({
  works,
  isEn,
}: {
  works: any[];
  isEn?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [embedVideo, setEmbedVideo] = useState(false);

  if (!works || works.length === 0) return null;

  const currentWork = works[currentIndex] || works[0];

  useEffect(() => {
    if (works.length <= 1 || isHovered || embedVideo) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % works.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [works.length, isHovered, embedVideo]);

  const handleSelectSlide = (idx: number) => {
    setEmbedVideo(false);
    setCurrentIndex(idx);
  };

  const handleNext = () => {
    setEmbedVideo(false);
    setCurrentIndex((prev) => (prev + 1) % works.length);
  };

  const handlePrev = () => {
    setEmbedVideo(false);
    setCurrentIndex((prev) => (prev - 1 + works.length) % works.length);
  };

  const ytIdFromUrl = currentWork.videoUrl
    ? (currentWork.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) || [])[1]
    : null;
  const ytId = currentWork.youtubeId || ytIdFromUrl;
  const highResThumb = ytId
    ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    : currentWork.imageUrl || 'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';

  const matchedLevel = currentWork.matchedLevel;
  const targetLevelUrl = matchedLevel ? levelPath(matchedLevel) : currentWork.gdLevelId ? `/levels?search=${currentWork.gdLevelId}` : null;
  const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1` : null;

  return (
    <div
      className="ui-card relative w-full h-full rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 flex flex-col"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Row */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between gap-3 bg-black/5 dark:bg-black/15 shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Hammer className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <h2 className="text-xs font-bold ui-title">Featured Creator Works</h2>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            {works.length} {isEn ? 'Levels' : 'Màn chơi'}
          </span>
        </div>

        {works.length > 1 && (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-black/40 text-sky-600 dark:text-sky-400 border border-black/10 dark:border-white/10">
            {currentIndex + 1} / {works.length}
          </span>
        )}
      </div>

      {/* Main Slide Canvas */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-3 sm:p-4 flex-1">
        {embedVideo && embedUrl ? (
          <div className="absolute inset-0 z-20 bg-black flex flex-col">
            <div className="p-1 bg-black/80 flex items-center justify-between border-b border-white/10 px-3">
              <span className="text-xs font-bold text-white truncate">{currentWork.levelName}</span>
              <button
                type="button"
                onClick={() => setEmbedVideo(false)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{isEn ? 'Close' : 'Đóng'}</span>
              </button>
            </div>
            <div className="flex-1 w-full h-full">
              <iframe
                src={embedUrl}
                title={currentWork.levelName || 'Level Video'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <>
            {/* Background Thumbnail */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                key={currentWork.id || currentIndex}
                src={highResThumb}
                alt={currentWork.levelName || ''}
                className="w-full h-full object-cover transition-all duration-700 ease-out"
                style={{ filter: 'brightness(0.48) contrast(1.15)' }}
                onError={(e) => {
                  if (ytId && (e.currentTarget as HTMLImageElement).src.includes('maxresdefault')) {
                    (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                  } else {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';
                  }
                }}
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Top Badges */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <DifficultyRatingIcon
                  difficultyFace={currentWork.difficultyFace || 0}
                  ratingType={currentWork.ratingType || 'NONE'}
                  className="w-6 h-6 drop-shadow-sm"
                />
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/90 border border-white/15 backdrop-blur-xs">
                  ID: {currentWork.gdLevelId || '—'}
                </span>
                {matchedLevel?.basePp ? (
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                    {matchedLevel.basePp} Pt
                  </span>
                ) : null}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="relative z-10 space-y-1 max-w-lg">
              <div>
                {targetLevelUrl ? (
                  <Link
                    href={targetLevelUrl}
                    className="text-base sm:text-lg font-black text-white hover:text-sky-300 drop-shadow-md tracking-tight block truncate transition-colors"
                  >
                    {currentWork.levelName || 'Untitled Level'}
                  </Link>
                ) : (
                  <h3 className="text-base sm:text-lg font-black text-white drop-shadow-md tracking-tight truncate">
                    {currentWork.levelName || 'Untitled Level'}
                  </h3>
                )}
                <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                  <span>{isEn ? 'by' : 'bởi'} <strong className="text-white font-bold">{currentWork.user?.username || currentWork.creatorName || 'GD Creator'}</strong></span>
                  {matchedLevel?.verifier && (
                    <span className="border-l border-white/20 pl-2 ui-dim">Verifier: <strong className="text-white">{matchedLevel.verifier}</strong></span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                {ytId && (
                  <button
                    type="button"
                    onClick={() => setEmbedVideo(true)}
                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>{isEn ? 'Watch Video' : 'Xem Video'}</span>
                  </button>
                )}

                {targetLevelUrl && (
                  <Link
                    href={targetLevelUrl}
                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-white/20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center gap-1"
                  >
                    <span>{isEn ? 'Details' : 'Chi tiết'}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Navigation Arrows */}
            {works.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-xs flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-md"
                  title={isEn ? 'Previous' : 'Trước'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-xs flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-md"
                  title={isEn ? 'Next' : 'Sau'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {works.length > 1 && (
              <div className="absolute bottom-2 right-3 flex items-center gap-1 z-20">
                {works.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === currentIndex ? 'w-4 bg-sky-400' : 'w-1.5 bg-white/35 hover:bg-white/70'
                    }`}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

/**
 * Esports Podium Showcase (Bục biểu đồ cột vinh danh Top 1-5, #1 đứng giữa, điểm trên avatar, tên dưới avatar)
 */
function ClanPodiumLeaderboard({
  members,
  isEn,
}: {
  members: any[];
  isEn?: boolean;
}) {
  if (!members || members.length === 0) {
    return (
      <div
        className="ui-card relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border shadow-xl flex flex-col items-center justify-center p-6 text-center space-y-3"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
      >
        <Trophy className="w-10 h-10 ui-dim opacity-30" />
        <div>
          <h2 className="text-sm font-bold ui-title">Leaderboard</h2>
          <p className="text-xs ui-dim mt-1 max-w-xs">
            {isEn ? 'No member rankings available.' : 'Chưa có dữ liệu xếp hạng thành viên.'}
          </p>
        </div>
      </div>
    );
  }

  const top5 = members.slice(0, 5);

  // Reorder into Podium layout: #4, #2, #1 (center, tallest), #3, #5
  let podiumSlots: Array<{ item: any; rank: number }> = [];
  if (top5.length === 1) {
    podiumSlots = [{ item: top5[0], rank: 1 }];
  } else if (top5.length === 2) {
    podiumSlots = [
      { item: top5[1], rank: 2 },
      { item: top5[0], rank: 1 },
    ];
  } else if (top5.length === 3) {
    podiumSlots = [
      { item: top5[1], rank: 2 },
      { item: top5[0], rank: 1 },
      { item: top5[2], rank: 3 },
    ];
  } else if (top5.length === 4) {
    podiumSlots = [
      { item: top5[3], rank: 4 },
      { item: top5[1], rank: 2 },
      { item: top5[0], rank: 1 },
      { item: top5[2], rank: 3 },
    ];
  } else {
    podiumSlots = [
      { item: top5[3], rank: 4 },
      { item: top5[1], rank: 2 },
      { item: top5[0], rank: 1 },
      { item: top5[2], rank: 3 },
      { item: top5[4], rank: 5 },
    ];
  }

  return (
    <div
      className="ui-card rounded-2xl border p-4 sm:p-5 flex flex-col justify-between h-full shadow-xl space-y-3"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-sm font-bold ui-title flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Leaderboard
          </h2>
          <p className="text-[11px] ui-dim mt-0.5">
            {isEn ? 'Member rankings by Classic Pt' : 'Bảng xếp hạng thành viên theo điểm Classic Pt'}
          </p>
        </div>
        <span className="font-mono text-xs font-bold ui-dim px-2 py-0.5 rounded-lg bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/5 text-slate-700 dark:text-slate-300">
          {members.length} {isEn ? 'members' : 'thành viên'}
        </span>
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

            const ptVal = (item.user?.classicPp || 0).toLocaleString();

            // Pedestal heights (compacted to match Clan's Hardest height)
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
              ? 'border-t-4 border-amber-500 dark:border-amber-400 bg-gradient-to-t from-amber-500/25 via-amber-500/10 to-transparent shadow-[0_0_16px_rgba(245,158,11,0.2)]'
              : isRank2
              ? 'border-t-4 border-slate-500 dark:border-slate-300 bg-gradient-to-t from-slate-400/35 dark:from-slate-400/20 via-slate-300/20 dark:via-slate-400/10 to-transparent shadow-xs'
              : isRank3
              ? 'border-t-4 border-amber-600 dark:border-amber-600 bg-gradient-to-t from-amber-600/30 dark:from-amber-700/20 via-amber-600/15 dark:via-amber-700/10 to-transparent shadow-xs'
              : 'border-t-2 border-slate-400 dark:border-white/20 bg-slate-200/80 dark:bg-white/5';

            const avatarSize = isRank1
              ? 'w-13 h-13 sm:w-16 sm:h-16 ring-3 ring-amber-500 dark:ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : isRank2
              ? 'w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-slate-500 dark:ring-slate-300 shadow-md'
              : isRank3
              ? 'w-10 h-10 sm:w-11 sm:h-11 ring-2 ring-amber-600 shadow-md'
              : isRank4
              ? 'w-8 h-8 sm:w-9 sm:h-9 ring-1 ring-slate-400 dark:ring-white/20'
              : 'w-7 h-7 sm:w-8 sm:h-8 ring-1 ring-slate-400 dark:ring-white/20';

            return (
              <div
                key={item.id || item.userId || rank}
                className={`flex flex-col items-center flex-1 min-w-0 max-w-[90px] sm:max-w-[110px] ${
                  isRank1 ? 'z-10' : 'z-[1]'
                }`}
              >
                {/* 1. ĐIỂM TRÊN AVATAR */}
                <div className="flex flex-col items-center mb-1.5">
                  {isRank1 && (
                    <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400 drop-shadow mb-0.5 animate-bounce" />
                  )}
                  <span
                    className={`font-mono font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${
                      isRank1
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 dark:border-amber-400/50'
                        : isRank2
                        ? 'bg-slate-200 text-slate-900 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 font-black'
                        : isRank3
                        ? 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-black'
                        : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-black/60 dark:text-white/80 dark:border-white/10 text-[9px]'
                    }`}
                  >
                    {ptVal} Pt
                  </span>
                </div>

                {/* 2. AVATAR */}
                <Link
                  href={`/profile/${item.user.username}`}
                  className="group relative block transition-transform hover:scale-105"
                >
                  <div className={`rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 shrink-0 ${avatarSize}`}>
                    {item.user.avatarUrl ? (
                      <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xs ui-dim">
                        {item.user.username ? item.user.username[0] : '?'}
                      </div>
                    )}
                  </div>
                </Link>

                {/* 3. TÊN DƯỚI AVATAR */}
                <div className="text-center mt-1.5 mb-1.5 w-full px-0.5">
                  <Link
                    href={`/profile/${item.user.username}`}
                    className="font-bold text-[11px] sm:text-xs ui-title truncate block hover:underline"
                  >
                    <UserDisplayName user={item.user} showClanTag={false} />
                  </Link>

                  {item.role === 'LEADER' ? (
                    <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase">
                      Leader
                    </span>
                  ) : item.role === 'MODERATOR' ? (
                    <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[8px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                      Mod
                    </span>
                  ) : null}
                </div>

                {/* 4. BIỂU ĐỒ CỘT (PEDESTAL COLUMN) */}
                <div
                  className={`w-full rounded-t-xl flex flex-col items-center justify-start pt-2 transition-all ${pedestalHeight} ${pedestalBorder}`}
                >
                  <span
                    className={`font-black select-none ${
                      isRank1
                        ? 'text-xl sm:text-2xl text-amber-600 dark:text-amber-400 drop-shadow'
                        : isRank2
                        ? 'text-lg sm:text-xl text-slate-900 dark:text-slate-100'
                        : isRank3
                        ? 'text-base sm:text-lg text-amber-900 dark:text-amber-300'
                        : 'text-sm text-slate-700 dark:text-white/70'
                    }`}
                  >
                    #{rank}
                  </span>
                  <span
                    className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                      isRank1
                        ? 'text-amber-700 dark:text-amber-400/90'
                        : isRank2
                        ? 'text-slate-800 dark:text-slate-300 font-extrabold'
                        : isRank3
                        ? 'text-amber-900 dark:text-amber-400 font-extrabold'
                        : 'text-slate-600 dark:text-white/50'
                    }`}
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

export default function ClanProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const { showToast, showConfirm } = useToast();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [clan, setClan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSp, setUserSp] = useState<number>(0);

  // Modals
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  // Actions state
  const [pledgeAmount, setPledgeAmount] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClanData = async () => {
    try {
      const res = await fetch(`/api/clans/${slug}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || (isEn ? 'Clan not found.' : 'Không tìm thấy Clan.'), 'error');
        router.push('/clan');
        return;
      }
      setClan(data.clan);
    } catch {
      showToast(isEn ? 'Error loading Clan data.' : 'Lỗi khi tải thông tin Clan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1280) {
        setIsRosterOpen(true);
      } else {
        setIsRosterOpen(false);
      }

      const handleResize = () => {
        if (window.innerWidth < 1280) {
          setIsRosterOpen(false);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
    loadClanData();
  }, [slug]);

  if (loading) {
    return <div className="p-16 text-center text-xs ui-dim font-medium">{isEn ? 'Loading Clan information...' : 'Đang tải thông tin Clan...'}</div>;
  }
  if (!clan) return null;

  const myMembership = clan.myMembership;
  const isLeader = myMembership?.role === 'LEADER';
  const isClanMod = myMembership?.role === 'MODERATOR';
  const isAdminWeb = currentUser?.role === 'ADMIN';
  const isOwnerWeb =
    currentUser?.role === 'ADMIN' && currentUser?.username?.toLowerCase() === 'ineqah';
  const canManageClan = isLeader || isClanMod || isOwnerWeb;
  const tierInfo = getClanTier(clan.totalSp);

  const videoEmbedUrl = getYouTubeEmbedUrl(clan.videoUrl);

  // Leave Clan
  const handleLeave = () => {
    showConfirm(
      isEn
        ? 'Are you sure you want to leave this Clan? All your pledged SP coins will be refunded.'
        : 'Bạn có chắc chắn muốn rời khỏi Clan này không? Mọi đóng góp SP coin của bạn sẽ được hoàn lại.',
      async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/clans/${clan.slug}/members/${myMembership.id}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(isEn ? 'Left the Clan.' : 'Đã rời khỏi Clan.', 'success');
            loadClanData();
          } else {
            showToast(data.error || (isEn ? 'Could not leave Clan.' : 'Không thể rời Clan.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Server connection error.' : 'Lỗi kết nối máy chủ.', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Donate / Pledge SP Coin
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pledgeAmount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isEn ? 'Successfully pledged SP to upgrade Clan!' : 'Đã đóng góp SP nâng cấp Clan thành công!', 'success');
        setIsDonateOpen(false);
        loadClanData();
      } else {
        showToast(data.error || (isEn ? 'Could not upgrade Clan.' : 'Không thể nâng cấp Clan.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Server connection error.' : 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Member management: promote / demote
  const handleRoleChange = async (memberId: string, newRole: 'MODERATOR' | 'MEMBER') => {
    try {
      const res = await fetch(`/api/clans/${clan.slug}/members/${memberId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isEn ? 'Updated member role!' : 'Đã cập nhật chức vụ thành viên!', 'success');
        loadClanData();
      } else {
        showToast(data.error || (isEn ? 'Action failed.' : 'Lỗi thao tác.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Server connection error.' : 'Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Member management: kick
  const handleKick = (memberId: string, username: string) => {
    showConfirm(
      isEn
        ? `Kick [${username}]? This member will be removed from the Clan and their pledged SP coins will be revoked.`
        : `Trục xuất [${username}]? Thành viên này sẽ bị xóa khỏi Clan và số SP đóng góp của họ sẽ bị thu hồi.`,
      async () => {
        try {
          const res = await fetch(`/api/clans/${clan.slug}/members/${memberId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(isEn ? 'Removed member from Clan.' : 'Đã xóa thành viên khỏi Clan.', 'success');
            loadClanData();
          } else {
            showToast(data.error || (isEn ? 'Action failed.' : 'Lỗi thao tác.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Server connection error.' : 'Lỗi kết nối máy chủ.', 'error');
        }
      }
    );
  };

  const allMembers = [
    ...(clan.membersGrouped?.leader ? [clan.membersGrouped.leader] : []),
    ...(clan.membersGrouped?.mods || []),
    ...(clan.membersGrouped?.members || []),
  ];

  const leaderboardMembers = [...allMembers].sort((a, b) => {
    const ptA = a.user?.classicPp ?? 0;
    const ptB = b.user?.classicPp ?? 0;
    return ptB - ptA;
  });

  const totalClanPt = allMembers.reduce((sum: number, m: any) => sum + (m.user?.classicPp || 0), 0);

  // 3 Key Members for the Profile-style Cards:
  const leaderMember = clan.membersGrouped?.leader;
  const bestPlayer = allMembers.length > 0
    ? [...allMembers].sort((a, b) => (b.user?.classicPp || 0) - (a.user?.classicPp || 0))[0]
    : null;
  const bestCreator = allMembers.length > 0
    ? [...allMembers].sort((a, b) => (b.user?.creatorPoints || 0) - (a.user?.creatorPoints || 0))[0]
    : null;

  const isTier3 = tierInfo.tier === 3;

  let targetSp = 3;
  let targetTierName = 'Tier 1';
  if (clan.totalSp >= 20) {
    targetSp = clan.totalSp;
    targetTierName = 'Tier 3';
  } else if (clan.totalSp >= 10) {
    targetSp = 20;
    targetTierName = 'Tier 3';
  } else if (clan.totalSp >= 3) {
    targetSp = 10;
    targetTierName = 'Tier 2';
  } else {
    targetSp = 3;
    targetTierName = 'Tier 1';
  }

  const progressPercentage =
    clan.totalSp >= 20
      ? 100
      : Math.min(100, Math.max(0, Math.round((clan.totalSp / targetSp) * 100)));

  // Theme tùy chỉnh toàn trang Clan
  const clanThemeStyle: React.CSSProperties & Record<string, string> = {};

  const rawClanTheme = (clan.themeGradient || '') + ' ' + (clan.themeColor || '');
  const glowMatch = rawClanTheme.match(/\/\*glow:(\d+):(\d+)\*\//);
  // Chỉ Clan Tier 3 mới có hiệu ứng Glow
  const clanGlowEnabled = isTier3 ? (glowMatch ? glowMatch[1] === '1' : true) : false;
  const clanGlowOpacity = glowMatch ? Math.min(Math.max(parseInt(glowMatch[2], 10) || 70, 10), 100) : 70;

  const cleanThemeGradient = clan.themeGradient ? clan.themeGradient.replace(/\/\*.*?\*\//g, '').trim() : null;
  const cleanThemeColor = clan.themeColor ? (clan.themeColor.match(/#([0-9a-fA-F]{3,8})/) ? clan.themeColor.match(/#([0-9a-fA-F]{3,8})/)![0] : clan.themeColor.replace(/\/\*.*?\*\//g, '').trim()) : null;

  let clanColors: string[] = [];
  let clanAngle = 135;

  if (cleanThemeGradient) {
    const hexMatches = cleanThemeGradient.match(/#([0-9a-fA-F]{3,8})/g);
    if (hexMatches && hexMatches.length > 0) {
      clanColors = hexMatches;
    }
    const angleMatch = cleanThemeGradient.match(/(\d+)deg/);
    if (angleMatch) {
      clanAngle = parseInt(angleMatch[1], 10);
    }
    clanThemeStyle['--accent-gradient'] = cleanThemeGradient;
  } else if (cleanThemeColor && /^#([0-9a-fA-F]{3,8})$/.test(cleanThemeColor)) {
    clanColors = [cleanThemeColor];
    clanThemeStyle['--accent'] = cleanThemeColor;
  }

  const isTier2Plus = tierInfo.tier >= 2;
  const hasCustomClanTheme = clanColors.length > 0;
  if (hasCustomClanTheme || isTier3) {
    const themeColors = clanColors.length > 0 ? clanColors : ['#a855f7', '#6366f1'];
    const themeVars = getCustomThemeVars(
      themeColors,
      isDark,
      clanAngle,
      undefined,
      true,
      isTier3 && clanGlowEnabled,
      themeColors,
      clanAngle
    );

    if (isTier3 && clanGlowEnabled) {
      const alpha = (clanGlowOpacity / 100) * (isDark ? 0.55 : 0.35);
      const blur = Math.round(14 + (clanGlowOpacity / 100) * 16);
      if (themeColors.length >= 2) {
        const rad = (clanAngle * Math.PI) / 180;
        const ox = Math.round(Math.sin(rad) * 8);
        const oy = Math.round(-Math.cos(rad) * 8);
        themeVars['--border-glow-shadow'] = `${ox}px ${oy}px ${blur}px 1px ${hexToRgba(themeColors[1], alpha)}, ${-ox}px ${-oy}px ${blur}px 1px ${hexToRgba(themeColors[0], alpha)}, 0 0 ${Math.round(blur * 0.75)}px 2px ${hexToRgba(themeColors[0], alpha * 0.8)}`;
      } else {
        themeVars['--border-glow-shadow'] = `0 0 ${blur}px 2px ${hexToRgba(themeColors[0], alpha)}`;
      }
    } else {
      themeVars['--border-glow'] = 'transparent';
      themeVars['--border-glow-shadow'] = 'none';
    }

    Object.assign(clanThemeStyle, themeVars);
  } else {
    clanThemeStyle['--border-glow'] = 'transparent';
    clanThemeStyle['--border-glow-shadow'] = 'none';
  }

  return (
    <div
      className="relative min-h-[calc(100vh-8rem)] pb-16 transition-colors duration-300"
      style={clanThemeStyle}
      data-tier3={isTier3 && clanGlowEnabled ? 'true' : undefined}
    >
      {/* Full-bleed Clan Theme Backdrop */}
      {hasCustomClanTheme && (
        <div
          className="fixed inset-0 md:left-64 pointer-events-none z-0 transition-colors duration-500 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-page)',
          }}
        >
          {cleanThemeGradient ? (
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                background: cleanThemeGradient,
                opacity: clanGlowEnabled && isTier3 ? (clanGlowOpacity / 100) * (isDark ? 0.35 : 0.14) : (isDark ? 0.05 : 0.02),
              }}
            />
          ) : cleanThemeColor ? (
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${cleanThemeColor} 0%, transparent 75%)`,
                opacity: clanGlowEnabled && isTier3 ? (clanGlowOpacity / 100) * (isDark ? 0.3 : 0.12) : (isDark ? 0.05 : 0.02),
              }}
            />
          ) : null}
          {isDark && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-black/50 pointer-events-none" />
          )}
        </div>
      )}

      <div className={`relative z-[1] max-w-6xl mx-auto space-y-6 transition-all duration-300 ease-in-out ${isRosterOpen ? 'xl:-translate-x-14 2xl:-translate-x-16' : ''}`}>
        {/* HERO CARD (Tương tự cấu trúc trang Profile) */}
        <div
          className="ui-card rounded-3xl border overflow-hidden shadow-2xl relative"
          style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
        >
          {/* Panoramic Cover */}
          <div className="h-44 sm:h-64 w-full relative bg-slate-900 overflow-hidden">
            {clan.coverUrl ? (
              <img src={clan.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"
                style={cleanThemeGradient ? { background: cleanThemeGradient } : undefined}
              >
                <span className="font-mono font-black text-4xl text-white/10">[{clan.tag}]</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Clan Identity & Actions Bar */}
          <div
            className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: isDark
                ? 'var(--bg-card)'
                : 'color-mix(in srgb, var(--accent) 3%, #ffffff)',
            }}
          >
            {/* Tag, Name & Tier Badge */}
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <span
                className="inline-flex items-center px-3 py-1 rounded-xl border font-mono font-black text-sm shadow-xs shrink-0 backdrop-blur-xs select-none"
                style={{
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
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
                      : { color: clan.color || 'var(--accent)' }
                  }
                >
                  [{clan.tag}]
                </span>
              </span>

              <h1 className="text-xl sm:text-2xl font-black ui-title tracking-tight truncate">
                {clan.name}
              </h1>

              <span
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shrink-0 shadow-sm ${
                  tierInfo.tier === 3
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-[0_0_14px_rgba(168,85,247,0.45)] dark:bg-purple-500/30 dark:text-purple-100 dark:border-purple-300/70'
                    : tierInfo.tier === 2
                    ? 'bg-sky-500/25 text-sky-200 border-sky-400/60 shadow-[0_0_14px_rgba(14,165,233,0.45)] dark:bg-sky-500/30 dark:text-sky-100 dark:border-sky-300/70'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100'
                }`}
              >
                {tierInfo.name}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {myMembership && (
                <button
                  type="button"
                  onClick={() => setIsDonateOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer hover:border-amber-400/50 shadow-xs"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{isEn ? 'Upgrade Clan' : 'Nâng cấp Clan'}</span>
                </button>
              )}

              {canManageClan && (
                <Link
                  href={`/clan/${clan.slug}/settings`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer hover:border-sky-400/50 shadow-xs relative"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  title={isEn ? 'Clan Settings' : 'Cài đặt Clan'}
                >
                  <Settings className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  <span>{isEn ? 'Settings' : 'Cài đặt'}</span>
                  {clan.pendingRequests?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-black animate-pulse">
                      {clan.pendingRequests.length}
                    </span>
                  )}
                </Link>
              )}

              {!myMembership && (
                clan.myPendingRequest ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Requested (Pending)' : 'Đã xin vào (Chờ duyệt)'}</span>
                  </div>
                ) : clan.isSuspended ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    {isEn ? 'Clan Suspended' : 'Clan đang tạm dừng'}
                  </div>
                ) : clan.memberCount >= tierInfo.maxMembers ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border ui-border ui-dim">
                    {isEn ? `Clan is Full (${clan.memberCount}/${tierInfo.maxMembers})` : `Clan đã đủ thành viên (${clan.memberCount}/${tierInfo.maxMembers})`}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        router.push('/login');
                        return;
                      }
                      setIsJoinModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-md"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isEn ? 'Join Clan' : 'Xin gia nhập'}</span>
                  </button>
                )
              )}

              {myMembership && !isLeader && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="p-2 rounded-xl border text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer shadow-xs"
                  title={isEn ? 'Leave Clan' : 'Rời khỏi Clan'}
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Integrated Clan Telemetry Bar */}
          <div
            className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-t transition-colors"
            style={{
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.25)'
                : 'color-mix(in srgb, var(--accent) 5%, #ffffff)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* SP Progress (7 cols) */}
            <div className="md:col-span-7 space-y-2 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="font-bold text-xs ui-title">{isEn ? 'SP Coin Progress' : 'Tiến trình SP Coin'}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    {clan.totalSp >= 20 ? (isEn ? 'Max Level (Tier 3)' : 'Cấp tối đa (Tier 3)') : (isEn ? `Target ${targetTierName}` : `Mục tiêu ${targetTierName}`)}
                  </span>
                </div>
                <div className="font-mono text-xs font-black text-amber-700 dark:text-amber-300">
                  {clan.totalSp} / {targetSp} SP
                </div>
              </div>

              <div
                className="w-full h-2.5 rounded-full overflow-hidden p-0.5 border"
                style={{
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{
                    width: `${progressPercentage}%`,
                    ...(cleanThemeGradient ? { background: cleanThemeGradient } : {}),
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] ui-dim">
                <span className="font-medium">
                  {clan.totalSp >= 20
                    ? (isEn ? 'Clan has reached the maximum tier!' : 'Clan đang ở cấp bậc cao nhất!')
                    : (isEn ? `Need ${Math.max(0, targetSp - clan.totalSp)} more SP to reach ${targetTierName}` : `Cần thêm ${Math.max(0, targetSp - clan.totalSp)} SP để lên ${targetTierName}`)}
                </span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-300">{progressPercentage}%</span>
              </div>
            </div>

            {/* Quick Metrics (5 cols) */}
            <div
              className="md:col-span-5 flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 md:border-l md:pl-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="text-left md:text-right">
                <span className="text-[11px] ui-dim block font-medium">{isEn ? 'Total Clan Pt' : 'Tổng Clan Pt'}</span>
                <div className="flex items-center md:justify-end gap-1.5 font-mono text-base font-black text-amber-700 dark:text-amber-400">
                  <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>{totalClanPt.toLocaleString()} Pt</span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <span className="text-[11px] ui-dim block font-medium">{isEn ? 'Members' : 'Thành viên'}</span>
                <div className="flex items-center md:justify-end gap-1.5 font-mono text-base font-black ui-title">
                  <Users className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span>
                    {clan.memberCount} <span className="text-xs ui-dim font-normal">/ {tierInfo.maxMembers}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Notices */}
          {clan.isSuspended ? (
            <div className="px-6 py-3 bg-red-500/15 border-t border-red-500/20 flex items-center gap-2 text-xs font-semibold text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{isEn ? 'Clan is currently suspended because total SP coins is below 3. Pledge more SP to resume operations!' : 'Clan đang bị tạm ngưng do tổng SP coin dưới 3. Đóng góp thêm SP để mở lại hoạt động!'}</span>
            </div>
          ) : clan.gracePeriodUntil ? (
            <div className="px-6 py-3 bg-amber-500/15 border-t border-amber-500/20 flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {isEn
                  ? `Grace period: Clan will be suspended on ${new Date(clan.gracePeriodUntil).toLocaleDateString('en-US')} unless 3 SP coins are pledged.`
                  : `Thời gian ân hạn: Clan sẽ tạm ngưng vào ${new Date(clan.gracePeriodUntil).toLocaleDateString('vi-VN')} nếu không đủ 3 SP coin.`}
              </span>
            </div>
          ) : null}
        </div>

        {/* 3 STATS CARDS (LEADER, BEST PLAYER, BEST CREATOR) + MÔ TẢ CLAN (Tương tự Profile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* 3 Người: Leader, Best Player, Best Creator (Left 6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
              {/* 1. Leader */}
              {leaderMember ? (
                <Link
                  href={`/profile/${leaderMember.user.username}`}
                  className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative transition-all cursor-pointer active:scale-95 border bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 group"
                >
                  <Crown className="w-5 h-5 mb-1.5 text-amber-500 dark:text-amber-400 drop-shadow group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Leader</div>
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40 bg-amber-500/10 dark:bg-slate-900 my-1.5 shrink-0">
                    {leaderMember.user.avatarUrl ? (
                      <img src={leaderMember.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {leaderMember.user.username[0]}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-xs ui-title truncate max-w-full group-hover:underline">
                    <UserDisplayName user={leaderMember.user} showClanTag={false} />
                  </div>
                  <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400/90 mt-1 font-mono">
                    {(leaderMember.user?.classicPp || 0).toLocaleString()} Pt
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border bg-amber-500/5 border-amber-500/20 ui-dim">
                  <Crown className="w-5 h-5 mb-1.5 text-amber-500/50 dark:text-amber-400/50" />
                  <div className="text-[10px] font-bold uppercase tracking-wider">Leader</div>
                  <div className="text-xs font-semibold mt-1">—</div>
                </div>
              )}

              {/* 2. Best Player */}
              {bestPlayer ? (
                <Link
                  href={`/profile/${bestPlayer.user.username}`}
                  className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative transition-all cursor-pointer active:scale-95 border bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/15 group"
                >
                  <Trophy className="w-5 h-5 mb-1.5 text-sky-500 dark:text-sky-400 drop-shadow group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">Best Player</div>
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-sky-500/40 bg-sky-500/10 dark:bg-slate-900 my-1.5 shrink-0">
                    {bestPlayer.user.avatarUrl ? (
                      <img src={bestPlayer.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 text-xs">
                        {bestPlayer.user.username[0]}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-xs ui-title truncate max-w-full group-hover:underline">
                    <UserDisplayName user={bestPlayer.user} showClanTag={false} />
                  </div>
                  <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400/90 mt-1 font-mono">
                    {(bestPlayer.user?.classicPp || 0).toLocaleString()} Pt
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border bg-sky-500/5 border-sky-500/20 ui-dim">
                  <Trophy className="w-5 h-5 mb-1.5 text-sky-500/50 dark:text-sky-400/50" />
                  <div className="text-[10px] font-bold uppercase tracking-wider">Best Player</div>
                  <div className="text-xs font-semibold mt-1">—</div>
                </div>
              )}

              {/* 3. Best Creator */}
              {bestCreator ? (
                <Link
                  href={`/profile/${bestCreator.user.username}`}
                  className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative transition-all cursor-pointer active:scale-95 border bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15 group"
                >
                  <Hammer className="w-5 h-5 mb-1.5 text-pink-500 dark:text-pink-400 drop-shadow group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">Best Creator</div>
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-pink-500/40 bg-pink-500/10 dark:bg-slate-900 my-1.5 shrink-0">
                    {bestCreator.user.avatarUrl ? (
                      <img src={bestCreator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-pink-600 dark:text-pink-400 text-xs">
                        {bestCreator.user.username[0]}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-xs ui-title truncate max-w-full group-hover:underline">
                    <UserDisplayName user={bestCreator.user} showClanTag={false} />
                  </div>
                  <div className="text-[10px] font-semibold text-pink-600 dark:text-pink-400/90 mt-1 font-mono">
                    {formatCp(bestCreator.user?.creatorPoints)} CP
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border bg-pink-500/5 border-pink-500/20 ui-dim">
                  <Hammer className="w-5 h-5 mb-1.5 text-pink-500/50 dark:text-pink-400/50" />
                  <div className="text-[10px] font-bold uppercase tracking-wider">Best Creator</div>
                  <div className="text-xs font-semibold mt-1">—</div>
                </div>
              )}
            </div>
          </div>

          {/* Giới thiệu (About Clan) (Right 6 cols) */}
          <div className="lg:col-span-6">
            <div
              className="ui-card p-5 rounded-2xl h-full flex flex-col justify-between space-y-3"
              style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-bold ui-title flex items-center gap-2 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-[color:var(--accent)]" />
                  {isEn ? 'About' : 'Giới thiệu'}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-[color:var(--text-body)] space-y-1.5 leading-relaxed break-words font-sans flex-1 overflow-y-auto max-h-56">
                {clan.description ? (
                  parseDiscordMarkdown(clan.description)
                ) : (
                  <p className="text-xs ui-dim italic py-4">
                    {isEn ? 'No description provided yet.' : 'Chưa có giới thiệu nào cho Clan.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: SIDE-BY-SIDE PODIUM LEADERBOARD & CLAN'S HARDEST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <ClanPodiumLeaderboard members={leaderboardMembers} isEn={isEn} />
          <ClanHardestSlideshow topBeaten={clan.top5Beaten || []} isEn={isEn} />
        </div>

        {/* ROW 4: MEDIA SHOWCASE & FAVORITE LEVEL (If set) */}
        {(videoEmbedUrl || clan.favoriteLevel) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {videoEmbedUrl && (
              <div
                className="ui-card rounded-2xl border p-4 space-y-3"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
              >
                <h2 className="text-xs font-bold ui-title flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-red-400" /> {isEn ? 'Clan Showcase Video' : 'Video giới thiệu Clan'}
                </h2>
                <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black shadow-inner" style={{ borderColor: 'var(--border-ui)' }}>
                  <iframe
                    src={videoEmbedUrl}
                    title="Clan Trailer"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {clan.favoriteLevel && (
              <div
                className="ui-card rounded-2xl border p-4 space-y-3 flex flex-col justify-between"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
              >
                <h2 className="text-xs font-bold ui-title flex items-center gap-2 text-pink-400">
                  <Heart className="w-3.5 h-3.5 fill-pink-500" /> {isEn ? 'Favorite Clan Level' : 'Màn chơi yêu thích của Clan'}
                </h2>
                <Link
                  href={levelPath(clan.favoriteLevel)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all group my-auto"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DifficultyRatingIcon
                      difficultyFace={clan.favoriteLevel.difficultyFace}
                      ratingType={clan.favoriteLevel.ratingType}
                      className="w-8 h-8 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs ui-title truncate group-hover:text-sky-400 transition-colors">
                        {clan.favoriteLevel.name}
                      </h3>
                      <p className="text-[10px] ui-dim truncate">{isEn ? 'by' : 'bởi'} {clan.favoriteLevel.creatorName || 'GD Creator'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {clan.favoriteLevel.basePp || 0} Pt
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ui-dim group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ROW 5: FEATURED CREATOR WORKS & COMING SOON PLACEHOLDER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Box 1: Featured Creator Works */}
          {clan.creatorWorks?.length > 0 ? (
            <CompactClanLevelsSlideshow works={clan.creatorWorks} isEn={isEn} />
          ) : (
            <div
              className="ui-card rounded-2xl border p-5 flex flex-col items-center justify-center text-center space-y-2 h-full min-h-[220px]"
              style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
            >
              <Hammer className="w-8 h-8 ui-dim opacity-40 mb-1" />
              <h3 className="text-xs font-bold ui-title">Featured Creator Works</h3>
              <p className="text-[11px] ui-dim max-w-xs leading-relaxed">
                {isEn ? 'No creator works published yet by clan members.' : 'Chưa có tác phẩm creator nào từ thành viên clan.'}
              </p>
            </div>
          )}

          {/* Box 2: Coming Soon Placeholder Box */}
          <div
            className="ui-card rounded-2xl border flex items-center justify-center text-center shadow-sm relative transition-all duration-300 min-h-[220px] h-full p-6"
            style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
          >
            <h2 className="text-base sm:text-lg font-bold ui-title tracking-wide">Coming soon</h2>
          </div>
        </div>

        {/* MODAL: DONATE SP */}
        {isDonateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-base font-bold ui-title flex items-center gap-2 text-amber-400">
                  <Coins className="w-5 h-5" /> {isEn ? 'Upgrade Clan with SP' : 'Nâng cấp Clan bằng SP'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDonateOpen(false)}
                  className="p-1.5 rounded-lg ui-dim hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDonate} className="space-y-4">
                <div
                  className="p-3 rounded-xl border flex items-center justify-between text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                >
                  <span className="ui-dim">{isEn ? 'Your available SP Coins:' : 'SP Coin khả dụng của bạn:'}</span>
                  <span className="font-mono text-amber-400 font-bold">{userSp} SP</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold ui-title">
                    {isEn ? 'SP coins to contribute' : 'Số điểm SP đóng góp nâng cấp'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={userSp}
                      value={pledgeAmount}
                      onChange={(e) => setPledgeAmount(parseInt(e.target.value, 10) || 0)}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400">
                      {pledgeAmount} SP
                    </span>
                  </div>
                  <p className="text-[11px] ui-dim leading-relaxed">
                    {isEn
                      ? 'Contributing SP increases the Clan Tier and keeps it active. SP coins will automatically expire when your Supporter duration ends.'
                      : 'Đóng góp SP giúp tăng cấp Tier Clan và duy trì hoạt động. Điểm SP sẽ tự động hết hiệu lực khi thời hạn Supporter của bạn hết hạn.'}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setIsDonateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    {isEn ? 'Cancel' : 'Hủy'}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                    {actionLoading
                      ? (isEn ? 'Saving...' : 'Đang lưu...')
                      : (isEn ? 'Confirm Upgrade' : 'Xác nhận nâng cấp')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: JOIN APPLICATION */}
        {isJoinModalOpen && (
          <JoinClanModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            clan={{
              id: clan.id,
              slug: clan.slug,
              name: clan.name,
              tag: clan.tag,
              coverUrl: clan.coverUrl,
              description: clan.description,
              color: clan.color,
              colorGradient: clan.colorGradient,
              totalSp: clan.totalSp,
              memberCount: clan.memberCount,
              maxMembers: tierInfo.maxMembers,
              leader: clan.leader,
            }}
            onSuccess={() => loadClanData()}
          />
        )}
      </div>

      {/* DEDICATED FULL-HEIGHT DISCORD RIGHT SIDEBAR (Docked to window right edge) */}
      <ClanDiscordMemberSidebar
        clan={clan}
        tierInfo={tierInfo}
        isLeader={isLeader}
        isClanMod={isClanMod}
        isOwnerWeb={isOwnerWeb}
        isEn={isEn}
        isOpen={isRosterOpen}
        onToggle={() => setIsRosterOpen((prev) => !prev)}
        onClose={() => setIsRosterOpen(false)}
        onRoleChange={handleRoleChange}
        onKick={handleKick}
      />
    </div>
  );
}
