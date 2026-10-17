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
  Check,
  X,
  Play,
  Hammer,
  UserCheck,
  ArrowRight,
  MoreVertical,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { UserDisplayName } from '@/components/UserDisplayName';
import ClanSettingsModal from '@/components/clan/ClanSettingsModal';
import JoinClanModal from '@/components/clan/JoinClanModal';
import { calculateUserSp, getClanTier } from '@/lib/clanTypes';
import { useTheme } from '@/components/ThemeProvider';
import { getCustomThemeVars } from '@/lib/customTheme';
import { DifficultyRatingIcon } from '@/components/DifficultyRatingIcon';
import { levelPath } from '@/lib/levelUrl';
import { AnimatedTabs, TabOption } from '@/components/AnimatedTabs';

type ClanTab = 'overview' | 'levels' | 'leaderboard' | 'members';

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
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
 * Interactive Cinematic Levels Slideshow Component
 */
function ClanLevelsSlideshow({
  works,
}: {
  works: any[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [embedVideo, setEmbedVideo] = useState(false);

  if (!works || works.length === 0) return null;

  const currentWork = works[currentIndex] || works[0];

  // Auto-advance every 5.5s when not hovered or watching video
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
      className="relative w-full rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header Row for Slideshow */}
      <div
        className="px-5 py-3 border-b flex items-center justify-between gap-3 bg-black/15"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold ui-title">Featured Creator Works</h2>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Slideshow
          </span>
        </div>

        {works.length > 1 && (
          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-black/40 text-amber-400 border border-white/10">
            {String(currentIndex + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Main Slide Canvas */}
      <div className="relative h-72 sm:h-84 md:h-[380px] w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-5 sm:p-7">
        {/* Embedded YouTube video if requested */}
        {embedVideo && embedUrl ? (
          <div className="absolute inset-0 z-20 bg-black flex flex-col">
            <div className="p-2 bg-black/80 flex items-center justify-between border-b border-white/10 px-4">
              <span className="text-xs font-bold text-white truncate">{currentWork.levelName}</span>
              <button
                type="button"
                onClick={() => setEmbedVideo(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng Video</span>
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
            {/* Background Thumbnail with Smooth Fade */}
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

            {/* Cinematic Vignette Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Top Floating Badges */}
            <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <DifficultyRatingIcon
                  difficultyFace={currentWork.difficultyFace || 0}
                  ratingType={currentWork.ratingType || 'NONE'}
                  className="w-9 h-9 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                />
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-black/60 text-white/90 border border-white/15 backdrop-blur-md">
                  ID: {currentWork.gdLevelId || '—'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  Đã duyệt
                </span>
              </div>
            </div>

            {/* Bottom Content Row */}
            <div className="relative z-10 space-y-3 max-w-2xl">
              <div>
                {targetLevelUrl ? (
                  <Link
                    href={targetLevelUrl}
                    className="text-2xl sm:text-3xl md:text-4xl font-black text-white hover:text-sky-300 drop-shadow-lg tracking-tight block transition-colors"
                  >
                    {currentWork.levelName || 'Untitled Level'}
                  </Link>
                ) : (
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg tracking-tight">
                    {currentWork.levelName || 'Untitled Level'}
                  </h3>
                )}

                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="ui-dim">Creator:</span>
                    <strong className="text-white font-bold">
                      {currentWork.user?.username || currentWork.creatorName || 'GD Creator'}
                    </strong>
                  </span>

                  {matchedLevel?.verifier && (
                    <span className="flex items-center gap-1.5 border-l border-white/20 pl-3">
                      <span className="ui-dim">Verifier:</span>
                      <strong className="text-white font-bold">{matchedLevel.verifier}</strong>
                    </span>
                  )}

                  {matchedLevel?.basePp ? (
                    <span className="font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg text-xs">
                      {matchedLevel.basePp} PP
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                {ytId && (
                  <button
                    type="button"
                    onClick={() => setEmbedVideo(true)}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Xem Video Ngay</span>
                  </button>
                )}

                {targetLevelUrl && (
                  <Link
                    href={targetLevelUrl}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 transition-all"
                  >
                    <span>Chi tiết màn chơi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {currentWork.videoUrl && !ytId && (
                  <a
                    href={currentWork.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Video</span>
                  </a>
                )}
              </div>
            </div>

            {/* Navigation Arrows */}
            {works.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-xl"
                  title="Màn chơi trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer z-20 shadow-xl"
                  title="Màn chơi kế tiếp"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {works.length > 1 && (
              <div className="absolute bottom-4 right-5 sm:right-7 flex items-center gap-1.5 z-20">
                {works.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      i === currentIndex
                        ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                        : 'w-2 bg-white/35 hover:bg-white/70'
                    }`}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Filmstrip Thumbnails Preview Row */}
      {works.length > 1 && (
        <div
          className="p-3 sm:p-4 bg-black/20 border-t flex items-center gap-2.5 overflow-x-auto scrollbar-none"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {works.map((w, idx) => {
            const isSelected = idx === currentIndex;
            const wYt = w.youtubeId || (w.videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([\w-]{11})/) || [])[1];
            const miniThumb = wYt
              ? `https://img.youtube.com/vi/${wYt}/mqdefault.jpg`
              : w.imageUrl || 'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';

            return (
              <button
                key={w.id || idx}
                type="button"
                onClick={() => handleSelectSlide(idx)}
                className={`relative shrink-0 flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border transition-all text-left cursor-pointer group ${
                  isSelected
                    ? 'border-amber-400/80 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                    : 'border-white/10 bg-black/30 opacity-70 hover:opacity-100 hover:border-white/25'
                }`}
              >
                <div className="w-12 h-8 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative">
                  <img src={miniThumb} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="min-w-0 max-w-[120px] sm:max-w-[160px]">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-white/90'}`}>
                    {w.levelName || 'Untitled'}
                  </p>
                  <p className="text-[10px] ui-dim truncate">ID: {w.gdLevelId || '—'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClanProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [clan, setClan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSp, setUserSp] = useState<number>(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<ClanTab>('overview');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  // Actions state
  const [pledgeAmount, setPledgeAmount] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClanData = async () => {
    try {
      const res = await fetch(`/api/clans/${slug}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Không tìm thấy Clan.', 'error');
        router.push('/clan');
        return;
      }
      setClan(data.clan);
    } catch {
      showToast('Lỗi khi tải thông tin Clan.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
    return <div className="p-16 text-center text-xs ui-dim font-medium">Đang tải thông tin Clan...</div>;
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
      'Bạn có chắc chắn muốn rời khỏi Clan này không? Mọi đóng góp SP coin của bạn sẽ được hoàn lại.',
      async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`/api/clans/${clan.slug}/members/${myMembership.id}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Đã rời khỏi Clan.', 'success');
            loadClanData();
          } else {
            showToast(data.error || 'Không thể rời Clan.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
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
        showToast('Đã đóng góp SP nâng cấp Clan thành công!', 'success');
        setIsDonateOpen(false);
        loadClanData();
      } else {
        showToast(data.error || 'Không thể nâng cấp Clan.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Process Join Request
  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/clans/${clan.slug}/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          action === 'approve' ? 'Đã duyệt thành viên mới.' : 'Đã từ chối yêu cầu.',
          'success'
        );
        loadClanData();
      } else {
        showToast(data.error || 'Lỗi thao tác.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
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
        showToast('Đã cập nhật chức vụ thành viên!', 'success');
        loadClanData();
      } else {
        showToast(data.error || 'Lỗi thao tác.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Member management: kick
  const handleKick = (memberId: string, username: string) => {
    showConfirm(
      `Trục xuất [${username}]? Thành viên này sẽ bị xóa khỏi Clan và số SP đóng góp của họ sẽ bị thu hồi.`,
      async () => {
        try {
          const res = await fetch(`/api/clans/${clan.slug}/members/${memberId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Đã xóa thành viên khỏi Clan.', 'success');
            loadClanData();
          } else {
            showToast(data.error || 'Lỗi thao tác.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    );
  };

  // Transfer Clan Ownership
  const handleTransfer = () => {
    if (!transferTargetId) return;
    showConfirm(
      'Bạn sẽ chuyển quyền Leader tối cao cho thành viên này. Hành động này không thể hoàn tác!',
      async () => {
        try {
          const res = await fetch(`/api/clans/${clan.slug}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newLeaderUserId: transferTargetId }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Đã chuyển giao quyền Leader thành công!', 'success');
            setIsTransferOpen(false);
            loadClanData();
          } else {
            showToast(data.error || 'Lỗi thao tác.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
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
    const ppA = a.user?.classicPp ?? 0;
    const ppB = b.user?.classicPp ?? 0;
    return ppB - ppA;
  });

  const totalClanPp = allMembers.reduce((sum: number, m: any) => sum + (m.user?.classicPp || 0), 0);

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

  // Theme tùy chỉnh toàn trang Clan (áp dụng toàn bộ màu box, border, text của trang clan, hoàn toàn không ảnh hưởng sidebar)
  const clanThemeStyle: React.CSSProperties & Record<string, string> = {};

  let clanColors: string[] = [];
  let clanAngle = 135;

  if (clan.themeGradient) {
    const hexMatches = clan.themeGradient.match(/#([0-9a-fA-F]{3,8})/g);
    if (hexMatches && hexMatches.length > 0) {
      clanColors = hexMatches;
    }
    const angleMatch = clan.themeGradient.match(/(\d+)deg/);
    if (angleMatch) {
      clanAngle = parseInt(angleMatch[1], 10);
    }
    clanThemeStyle['--accent-gradient'] = clan.themeGradient;
  } else if (clan.themeColor && /^#([0-9a-fA-F]{3,8})$/.test(clan.themeColor.trim())) {
    clanColors = [clan.themeColor.trim()];
    clanThemeStyle['--accent'] = clan.themeColor;
  }

  const hasCustomClanTheme = clanColors.length > 0;
  if (hasCustomClanTheme || isTier3) {
    const themeColors = clanColors.length > 0 ? clanColors : ['#a855f7', '#6366f1'];
    const themeVars = getCustomThemeVars(
      themeColors,
      isDark,
      clanAngle,
      undefined,
      true,
      isTier3,
      isTier3 ? themeColors : undefined,
      clanAngle
    );
    Object.assign(clanThemeStyle, themeVars);
  }

  // Navigation tab options
  const tabOptions: TabOption<ClanTab>[] = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'levels', label: `Levels (${clan.creatorWorks?.length || 0})`, icon: <Hammer className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: <Trophy className="w-4 h-4" /> },
    { id: 'members', label: `Thành viên (${clan.memberCount})`, icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div
      className="relative min-h-[calc(100vh-8rem)] pb-16 transition-colors duration-300"
      style={clanThemeStyle}
      data-tier3={isTier3 ? 'true' : undefined}
    >
      {/* Full-bleed Clan Theme Backdrop (covers entire content pane to the right of the sidebar) */}
      {hasCustomClanTheme && (
        <div
          className="fixed inset-0 md:left-64 pointer-events-none z-0 transition-colors duration-500 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-page)',
          }}
        >
          {clan.themeGradient ? (
            <div
              className="absolute inset-0 opacity-25 dark:opacity-30"
              style={{ background: clan.themeGradient }}
            />
          ) : clan.themeColor ? (
            <div
              className="absolute inset-0 opacity-20 dark:opacity-25"
              style={{
                background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${clan.themeColor} 0%, transparent 75%)`,
              }}
            />
          ) : null}
          {/* Subtle vignette gradient from top to bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-black/50 pointer-events-none" />
        </div>
      )}

      <div className="relative z-[1] max-w-6xl mx-auto space-y-6">
        {/* Clan Hero Command Header */}
        <div
          className="rounded-3xl border overflow-hidden shadow-2xl relative"
          style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
        >
          {/* Panoramic Cover */}
          <div className="h-44 sm:h-64 w-full relative bg-slate-900 overflow-hidden">
            {clan.coverUrl ? (
              <img src={clan.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"
                style={clan.themeGradient ? { background: clan.themeGradient } : undefined}
              >
                <span className="font-mono font-black text-4xl text-white/10">[{clan.tag}]</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Clan Identity & Actions Bar */}
          <div
            className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
          >
            {/* Tag, Name & Tier Badge */}
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {/* Isolated Tag Container */}
              <span
                className="inline-flex items-center px-3 py-1 rounded-xl border font-mono font-black text-sm shadow-xs shrink-0 backdrop-blur-xs select-none"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
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
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shrink-0 ${
                  tierInfo.tier === 3
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : tierInfo.tier === 2
                    ? 'bg-sky-950/80 text-sky-300 border-sky-500/40 shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                }`}
              >
                {tierInfo.name}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {/* Member Action: Nâng cấp Clan */}
              {myMembership && (
                <button
                  type="button"
                  onClick={() => setIsDonateOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer hover:border-amber-400/50 shadow-xs"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nâng cấp Clan</span>
                </button>
              )}

              {/* Leader / Mod: Pending Requests */}
              {canManageClan && clan.pendingRequests?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRequestsOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Đơn chờ ({clan.pendingRequests.length})</span>
                </button>
              )}

              {/* Leader / Mod / Owner: Clan Settings */}
              {canManageClan && (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-80 shadow-xs"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Settings className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cài đặt</span>
                </button>
              )}

              {/* Non-Member: Join Clan */}
              {!myMembership && (
                clan.myPendingRequest ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đã xin vào (Chờ duyệt)</span>
                  </div>
                ) : clan.isSuspended ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    Clan đang tạm dừng
                  </div>
                ) : clan.memberCount >= tierInfo.maxMembers ? (
                  <div className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border ui-border ui-dim">
                    Clan đã đủ thành viên ({clan.memberCount}/{tierInfo.maxMembers})
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
                    <span>Xin gia nhập</span>
                  </button>
                )
              )}

              {/* Member (not Leader): Leave Clan */}
              {myMembership && !isLeader && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="p-2 rounded-xl border text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer shadow-xs"
                  title="Rời khỏi Clan"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Integrated Clan Telemetry Bar */}
          <div
            className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-black/10"
          >
            {/* SP Progress (7 cols) */}
            <div className="md:col-span-7 space-y-2 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="font-bold ui-title">Tiến trình SP Coin</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {clan.totalSp >= 20 ? 'Cấp tối đa (Tier 3)' : `Mục tiêu ${targetTierName}`}
                  </span>
                </div>
                <div className="font-mono text-xs font-black text-amber-400">
                  {clan.totalSp} / {targetSp} SP
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2.5 rounded-full bg-black/30 dark:bg-black/50 border border-white/5 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{
                    width: `${progressPercentage}%`,
                    ...(clan.themeGradient ? { background: clan.themeGradient } : {}),
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] ui-dim">
                <span>
                  {clan.totalSp >= 20
                    ? 'Clan đang ở cấp bậc cao nhất!'
                    : `Cần thêm ${Math.max(0, targetSp - clan.totalSp)} SP để lên ${targetTierName}`}
                </span>
                <span className="font-mono font-bold text-amber-400/90">{progressPercentage}%</span>
              </div>
            </div>

            {/* Quick Metrics (5 cols) */}
            <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-6">
              {/* Total Clan PP */}
              <div className="text-left md:text-right">
                <span className="text-[11px] ui-dim block font-medium">Tổng Clan PP</span>
                <div className="flex items-center md:justify-end gap-1.5 font-mono text-base font-black text-amber-400">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{totalClanPp.toLocaleString()} PP</span>
                </div>
              </div>

              {/* Member Capacity */}
              <div className="text-left md:text-right">
                <span className="text-[11px] ui-dim block font-medium">Thành viên</span>
                <div className="flex items-center md:justify-end gap-1.5 font-mono text-base font-black ui-title">
                  <Users className="w-4 h-4 text-sky-400" />
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
              <span>Clan đang bị tạm ngưng do tổng SP coin dưới 3. Đóng góp thêm SP để mở lại hoạt động!</span>
            </div>
          ) : clan.gracePeriodUntil ? (
            <div className="px-6 py-3 bg-amber-500/15 border-t border-amber-500/20 flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Thời gian ân hạn: Clan sẽ tạm ngưng vào{' '}
                {new Date(clan.gracePeriodUntil).toLocaleDateString('vi-VN')} nếu không đủ 3 SP coin.
              </span>
            </div>
          ) : null}
        </div>

        {/* Tab Navigation Hub */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <AnimatedTabs
            options={tabOptions}
            active={activeTab}
            onChange={(id) => setActiveTab(id)}
            className="overflow-x-auto max-w-full"
          />
        </div>

        {/* TAB 1: TỔNG QUAN (OVERVIEW & SPOTLIGHT SHOWCASE) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Featured Creator Works Slideshow */}
            {clan.creatorWorks?.length > 0 && (
              <ClanLevelsSlideshow works={clan.creatorWorks} />
            )}

            {/* 2-Column Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 cols): Story & Demon Hall of Fame */}
              <div className="lg:col-span-7 space-y-6 min-w-0">
                {/* Giới thiệu Clan (Discord Markdown) */}
                {clan.description && (
                  <div
                    className="ui-card rounded-2xl border p-5 space-y-3"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <FileText className="w-4 h-4 text-[color:var(--accent)]" />
                      <h2 className="text-sm font-bold ui-title">Giới thiệu</h2>
                    </div>
                    <div className="text-xs sm:text-sm text-[color:var(--text-body)] space-y-1.5 leading-relaxed break-words font-sans">
                      {parseDiscordMarkdown(clan.description)}
                    </div>
                  </div>
                )}

                {/* Clan's Hardest (Top 5 Demon) */}
                {clan.top5Beaten?.length > 0 && (
                  <div
                    className="ui-card rounded-2xl border p-4 sm:p-5 space-y-3"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                      <h2 className="text-sm font-bold ui-title flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" /> Clan&apos;s Hardest
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('leaderboard')}
                        className="text-[11px] font-bold text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {clan.top5Beaten.slice(0, 5).map((item: any, idx: number) => {
                        const lvl = item.level;
                        return (
                          <div
                            key={lvl.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                              idx === 0 ? 'bg-amber-500/5 border-amber-500/25' : ''
                            }`}
                            style={{
                              backgroundColor: idx === 0 ? undefined : 'var(--bg-subtle)',
                              borderColor: idx === 0 ? undefined : 'var(--border-subtle)',
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-6 text-center font-black text-xs shrink-0 ${
                                  idx === 0
                                    ? 'text-amber-400'
                                    : idx === 1
                                    ? 'text-slate-300'
                                    : idx === 2
                                    ? 'text-amber-600'
                                    : 'ui-dim'
                                }`}
                              >
                                #{idx + 1}
                              </span>

                              <DifficultyRatingIcon
                                difficultyFace={lvl.difficultyFace}
                                ratingType={lvl.ratingType}
                                className="w-8 h-8 drop-shadow-sm"
                              />

                              <div className="min-w-0">
                                <Link
                                  href={levelPath(lvl)}
                                  className="font-bold text-xs ui-title hover:underline truncate block"
                                >
                                  {lvl.name}
                                </Link>
                                <span className="text-[11px] ui-dim flex items-center gap-1">
                                  Người beat: <UserDisplayName user={item.user} showClanTag={false} />
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-amber-400 block">
                                {lvl.basePp || 0} PP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Video giới thiệu Clan */}
                {videoEmbedUrl && (
                  <div
                    className="ui-card rounded-2xl border p-4 space-y-3"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <h2 className="text-sm font-bold ui-title flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-400" /> Video giới thiệu Clan
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
              </div>

              {/* Right Column (5 cols): Staff & Highlights */}
              <div className="lg:col-span-5 space-y-6">
                {/* Ban Quản Trị Clan */}
                <div
                  className="ui-card rounded-2xl border p-4 space-y-3"
                  style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h3 className="text-xs font-bold ui-title flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" /> Ban Quản Trị Clan
                    </h3>
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => setIsTransferOpen(true)}
                        className="text-[11px] font-bold text-amber-400 hover:underline"
                      >
                        Chuyển giao Leader
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Leader VIP Card */}
                    {clan.membersGrouped?.leader && (
                      <Link
                        href={`/profile/${clan.membersGrouped.leader.user.username}`}
                        className="p-3 rounded-xl border flex items-center gap-3 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 transition-all shadow-xs"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900 shrink-0">
                          {clan.membersGrouped.leader.user.avatarUrl ? (
                            <img src={clan.membersGrouped.leader.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-xs">
                              {clan.membersGrouped.leader.user.username[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <UserDisplayName user={clan.membersGrouped.leader.user} showClanTag={false} clanRole="LEADER" />
                          <span className="text-[10px] text-amber-400 font-bold block mt-0.5">Clan Leader</span>
                        </div>
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      </Link>
                    )}

                    {/* Clan Mods */}
                    {clan.membersGrouped?.mods?.slice(0, 2).map((mod: any) => (
                      <Link
                        key={mod.id}
                        href={`/profile/${mod.user.username}`}
                        className="p-2.5 rounded-xl border flex items-center gap-3 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900 shrink-0">
                          {mod.user.avatarUrl ? (
                            <img src={mod.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-emerald-400 text-xs">
                              {mod.user.username[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <UserDisplayName user={mod.user} showClanTag={false} clanRole="MODERATOR" />
                          <span className="text-[10px] text-emerald-400 font-bold block">Quản trị viên Clan</span>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Bảng Xếp Hạng Thành Viên Preview */}
                {leaderboardMembers.length > 0 && (
                  <div
                    className="ui-card rounded-2xl border p-4 space-y-3"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                      <h3 className="text-xs font-bold ui-title flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" /> Bảng xếp hạng thành viên
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('leaderboard')}
                        className="text-[11px] font-bold text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Tất cả ({leaderboardMembers.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {leaderboardMembers.slice(0, 5).map((m: any, idx: number) => {
                        const rankNum = idx + 1;
                        return (
                          <div
                            key={m.id || m.userId}
                            className="p-2 rounded-xl border flex items-center justify-between gap-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-5 text-center font-black text-xs shrink-0 ${
                                  rankNum === 1
                                    ? 'text-amber-400'
                                    : rankNum === 2
                                    ? 'text-slate-300'
                                    : rankNum === 3
                                    ? 'text-amber-600'
                                    : 'ui-dim'
                                }`}
                              >
                                #{rankNum}
                              </span>

                              <div className="w-7 h-7 rounded-lg overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                                {m.user?.avatarUrl ? (
                                  <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-[10px] ui-dim">
                                    {m.user?.username ? m.user.username[0] : '?'}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <Link href={`/profile/${m.user?.username}`} className="hover:underline block">
                                  <UserDisplayName user={m.user} showClanTag={false} />
                                </Link>
                              </div>
                            </div>

                            <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                              {(m.user?.classicPp || 0).toLocaleString()} PP
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Màn chơi yêu thích của Clan */}
                {clan.favoriteLevel && (
                  <div
                    className="ui-card rounded-2xl border p-4 space-y-3"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <h2 className="text-sm font-bold ui-title flex items-center gap-2 text-pink-400">
                      <Heart className="w-4 h-4 fill-pink-500" /> Màn chơi yêu thích của Clan
                    </h2>
                    <Link
                      href={levelPath(clan.favoriteLevel)}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DifficultyRatingIcon
                          difficultyFace={clan.favoriteLevel.difficultyFace}
                          ratingType={clan.favoriteLevel.ratingType}
                          className="w-9 h-9"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm ui-title truncate group-hover:text-sky-400 transition-colors">
                            {clan.favoriteLevel.name}
                          </h3>
                          <p className="text-xs ui-dim">bởi {clan.favoriteLevel.creatorName || 'GD Creator'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {clan.favoriteLevel.basePp || 0} PP
                        </span>
                        <ArrowRight className="w-4 h-4 ui-dim group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEVELS (FULL SHOWCASE & CAROUSEL) */}
        {activeTab === 'levels' && (
          <div className="space-y-6">
            {clan.creatorWorks?.length > 0 ? (
              <>
                {/* Widescreen Slideshow */}
                <ClanLevelsSlideshow works={clan.creatorWorks} />

                {/* Grid of All Works */}
                <div
                  className="ui-card rounded-2xl border p-5 space-y-4"
                  style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h3 className="text-sm font-bold ui-title flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-sky-400" /> Tất cả tác phẩm Creator ({clan.creatorWorks.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {clan.creatorWorks.map((work: any) => {
                      const ytIdFromUrl = work.videoUrl
                        ? (work.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) || [])[1]
                        : null;
                      const ytId = work.youtubeId || ytIdFromUrl;
                      const thumb = ytId
                        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                        : work.imageUrl || 'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';

                      const matchedLevel = work.matchedLevel;
                      const targetLevelUrl = matchedLevel ? levelPath(matchedLevel) : work.gdLevelId ? `/levels?search=${work.gdLevelId}` : null;

                      return (
                        <div
                          key={work.id}
                          className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all border ui-card flex flex-col h-48 justify-between p-3.5"
                          style={{ borderColor: 'var(--border-ui)' }}
                        >
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              style={{ filter: 'brightness(0.55)' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://raw.githubusercontent.com/GDColon/GDBrowser/master/assets/difficulties/demon-extreme-featured.png';
                              }}
                            />
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                          <div className="relative z-10 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <DifficultyRatingIcon
                                difficultyFace={work.difficultyFace || 0}
                                ratingType={work.ratingType || 'NONE'}
                                className="w-8 h-8 drop-shadow-md"
                              />
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/60 text-white/90 border border-white/10 backdrop-blur-xs">
                                ID: {work.gdLevelId || '—'}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-xs">
                              Đã duyệt
                            </span>
                          </div>

                          <div className="relative z-10 space-y-1">
                            {targetLevelUrl ? (
                              <Link
                                href={targetLevelUrl}
                                className="font-bold text-sm text-white drop-shadow-sm truncate block hover:text-sky-400 transition-colors"
                              >
                                {work.levelName || 'Untitled Level'}
                              </Link>
                            ) : (
                              <h4 className="font-bold text-sm text-white drop-shadow-sm truncate">
                                {work.levelName || 'Untitled Level'}
                              </h4>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300 text-[11px] truncate">
                                bởi <span className="font-semibold text-white">{work.user?.username || work.creatorName || 'GD Creator'}</span>
                              </span>

                              {work.videoUrl && (
                                <a
                                  href={work.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 hover:underline shrink-0 px-2 py-0.5 rounded-lg bg-black/60 border border-sky-500/30 backdrop-blur-xs transition-colors"
                                >
                                  <Play className="w-3 h-3 fill-sky-400" /> Xem Video
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div
                className="ui-card rounded-2xl border p-12 text-center space-y-3"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
                  <Hammer className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold ui-title">Chưa có tác phẩm Creator nào</h3>
                <p className="text-xs ui-dim max-w-sm mx-auto">
                  Thành viên Clan có thể gửi màn chơi do mình sáng tác tại mục Đệ Trình Creator để được xét duyệt và hiển thị tại đây!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BẢNG XẾP HẠNG & DANH HIỆU */}
        {activeTab === 'leaderboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Clan's Hardest (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div
                className="ui-card rounded-2xl border p-5 space-y-4 shadow-sm"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div>
                    <h2 className="text-sm font-bold ui-title flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" /> Clan&apos;s Hardest
                    </h2>
                    <p className="text-[11px] ui-dim mt-0.5">Top 5 Demon khó nhất từng được thành viên hoàn thành</p>
                  </div>
                </div>

                {clan.top5Beaten?.length > 0 ? (
                  <div className="space-y-2.5">
                    {clan.top5Beaten.map((item: any, idx: number) => {
                      const lvl = item.level;
                      return (
                        <div
                          key={lvl.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                            idx === 0 ? 'bg-amber-500/5 border-amber-500/30' : ''
                          }`}
                          style={{
                            backgroundColor: idx === 0 ? undefined : 'var(--bg-subtle)',
                            borderColor: idx === 0 ? undefined : 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 text-center font-black text-sm shrink-0 ${
                                idx === 0
                                  ? 'text-amber-400'
                                  : idx === 1
                                  ? 'text-slate-300'
                                  : idx === 2
                                  ? 'text-amber-600'
                                  : 'ui-dim'
                              }`}
                            >
                              #{idx + 1}
                            </span>

                            <DifficultyRatingIcon
                              difficultyFace={lvl.difficultyFace}
                              ratingType={lvl.ratingType}
                              className="w-9 h-9 drop-shadow-sm"
                            />

                            <div className="min-w-0">
                              <Link
                                href={levelPath(lvl)}
                                className="font-bold text-xs sm:text-sm ui-title hover:underline truncate block"
                              >
                                {lvl.name}
                              </Link>
                              <span className="text-[11px] ui-dim flex items-center gap-1 mt-0.5">
                                Người beat: <UserDisplayName user={item.user} showClanTag={false} />
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs sm:text-sm font-black text-amber-400 block">
                              {lvl.basePp || 0} PP
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs ui-dim">Chưa có thành viên nào ghi nhận kỷ lục Demon.</div>
                )}
              </div>
            </div>

            {/* Right: Bảng Xếp Hạng Thành Viên (6 cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div
                className="ui-card rounded-2xl border p-5 space-y-4 shadow-sm"
                style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div>
                    <h2 className="text-sm font-bold ui-title flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" /> Bảng xếp hạng thành viên
                    </h2>
                    <p className="text-[11px] ui-dim mt-0.5">Xếp hạng theo tổng Classic Points (PP) của từng người</p>
                  </div>
                  <span className="font-mono text-xs font-bold ui-dim">{leaderboardMembers.length} thành viên</span>
                </div>

                <div className="space-y-2">
                  {leaderboardMembers.map((m: any, idx: number) => {
                    const rankNumVal = idx + 1;
                    return (
                      <div
                        key={m.id || m.userId}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          rankNumVal === 1 ? 'bg-amber-500/5 border-amber-500/30' : ''
                        }`}
                        style={{
                          backgroundColor: rankNumVal === 1 ? undefined : 'var(--bg-subtle)',
                          borderColor: rankNumVal === 1 ? undefined : 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 text-center font-black text-xs shrink-0 ${
                              rankNumVal === 1
                                ? 'text-amber-400'
                                : rankNumVal === 2
                                ? 'text-slate-300'
                                : rankNumVal === 3
                                ? 'text-amber-600'
                                : 'ui-dim'
                            }`}
                          >
                            #{rankNumVal}
                          </span>

                          <div
                            className="w-8 h-8 rounded-xl overflow-hidden border bg-slate-900 shrink-0"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            {m.user?.avatarUrl ? (
                              <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                                {m.user?.username ? m.user.username[0] : '?'}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <Link href={`/profile/${m.user?.username}`} className="hover:underline">
                              <UserDisplayName user={m.user} showClanTag={false} />
                            </Link>

                            {m.role === 'LEADER' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Leader
                              </span>
                            )}
                            {m.role === 'MODERATOR' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Mod
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-amber-400 block">
                            {(m.user?.classicPp || 0).toLocaleString()} PP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: THÀNH VIÊN & DISCORD ROSTER */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Staff Showcase */}
            <div
              className="ui-card rounded-2xl border p-5 space-y-4 shadow-sm"
              style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h3 className="text-sm font-bold ui-title flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" /> Ban Quản Trị Clan
                  </h3>
                  <p className="text-[11px] ui-dim mt-0.5">Leader và Moderator phụ trách quản lý thành viên và xét duyệt</p>
                </div>

                {isLeader && (
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(true)}
                    className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Chuyển giao quyền Leader</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Leader Card */}
                {clan.membersGrouped?.leader && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900 shrink-0">
                      {clan.membersGrouped.leader.user.avatarUrl ? (
                        <img src={clan.membersGrouped.leader.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-amber-400 text-sm">
                          {clan.membersGrouped.leader.user.username[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${clan.membersGrouped.leader.user.username}`} className="hover:underline block truncate">
                        <UserDisplayName user={clan.membersGrouped.leader.user} showClanTag={false} clanRole="LEADER" />
                      </Link>
                      <span className="text-[11px] text-amber-400 font-bold block mt-0.5">Clan Leader</span>
                      <span className="text-[10px] ui-dim font-mono block mt-0.5">
                        {(clan.membersGrouped.leader.user.classicPp || 0).toLocaleString()} PP
                      </span>
                    </div>
                  </div>
                )}

                {/* Clan Mods */}
                {clan.membersGrouped?.mods?.map((mod: any) => (
                  <div key={mod.id} className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 flex items-center justify-between gap-3.5 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900 shrink-0">
                        {mod.user.avatarUrl ? (
                          <img src={mod.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-emerald-400 text-xs">
                            {mod.user.username[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/profile/${mod.user.username}`} className="hover:underline block truncate">
                          <UserDisplayName user={mod.user} showClanTag={false} clanRole="MODERATOR" />
                        </Link>
                        <span className="text-[11px] text-emerald-400 font-bold block mt-0.5">Quản trị viên Clan</span>
                      </div>
                    </div>

                    {(isLeader || isOwnerWeb) && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange(mod.id, 'MEMBER')}
                        className="text-[10px] font-bold text-slate-400 hover:text-amber-400 px-2 py-1 rounded border border-white/10 hover:border-amber-400/30 cursor-pointer shrink-0"
                        title="Hạ quyền xuống Member"
                      >
                        Hạ cấp
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Full Discord-Style Member Roster */}
            <div
              className="ui-card rounded-2xl border p-5 space-y-4 shadow-sm"
              style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-sm font-bold ui-title flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" /> Danh sách tất cả thành viên
                </h3>
                <span className="font-mono text-xs ui-dim font-bold">
                  {clan.memberCount} / {tierInfo.maxMembers} thành viên
                </span>
              </div>

              {/* Leader Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block px-1">
                  Leader — 1
                </span>
                {clan.membersGrouped?.leader && (
                  <div className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-amber-500/5 border-amber-500/20">
                    <Link
                      href={`/profile/${clan.membersGrouped.leader.user.username}`}
                      className="flex items-center gap-3 min-w-0 flex-1 hover:underline"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 bg-slate-900 shrink-0">
                        {clan.membersGrouped.leader.user.avatarUrl && (
                          <img src={clan.membersGrouped.leader.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <UserDisplayName user={clan.membersGrouped.leader.user} showClanTag={false} />
                    </Link>
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                )}
              </div>

              {/* Mods Section */}
              {clan.membersGrouped?.mods?.length > 0 && (
                <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block px-1">
                    Mod Clan — {clan.membersGrouped.mods.length}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clan.membersGrouped.mods.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                      >
                        <Link
                          href={`/profile/${m.user.username}`}
                          className="flex items-center gap-3 min-w-0 flex-1 hover:underline"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                            {m.user.avatarUrl && (
                              <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <UserDisplayName user={m.user} showClanTag={false} />
                        </Link>

                        <div className="flex items-center gap-2 shrink-0">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          {(isLeader || isOwnerWeb) && (
                            <button
                              type="button"
                              onClick={() => handleRoleChange(m.id, 'MEMBER')}
                              className="text-[10px] font-bold text-slate-400 hover:text-amber-400 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Hạ quyền xuống Member"
                            >
                              Hạ cấp
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[11px] font-black uppercase tracking-wider ui-dim block px-1">
                  Thành viên — {clan.membersGrouped?.members?.length || 0}
                </span>
                {clan.membersGrouped?.members?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clan.membersGrouped.members.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                      >
                        <Link
                          href={`/profile/${m.user.username}`}
                          className="flex items-center gap-3 min-w-0 flex-1 hover:underline"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                            {m.user.avatarUrl && (
                              <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <UserDisplayName user={m.user} showClanTag={false} />
                        </Link>

                        {(isLeader || isOwnerWeb) && (
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleRoleChange(m.id, 'MODERATOR')}
                              className="text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Bổ nhiệm làm Mod Clan"
                            >
                              Bổ nhiệm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleKick(m.id, m.user.username)}
                              className="text-[10px] font-bold text-red-400 hover:bg-red-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Trục xuất khỏi Clan"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs ui-dim px-2 py-4 italic">Chưa có thành viên nào khác.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DONATE SP */}
        {isDonateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-base font-bold ui-title flex items-center gap-2 text-amber-400">
                  <Coins className="w-5 h-5" /> Nâng cấp Clan bằng SP
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
                  <span className="ui-dim">SP Coin khả dụng của bạn:</span>
                  <span className="font-mono text-amber-400 font-bold">{userSp} SP</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold ui-title">Số điểm SP đóng góp nâng cấp</label>
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
                    Đóng góp SP giúp tăng cấp Tier Clan và duy trì hoạt động. Điểm SP sẽ tự động hết hiệu lực khi thời hạn Supporter của bạn hết hạn.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setIsDonateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                    {actionLoading ? 'Đang lưu...' : 'Xác nhận nâng cấp'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PENDING JOIN REQUESTS */}
        {isRequestsOpen && clan.pendingRequests && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-base font-bold ui-title flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" /> Đơn xin gia nhập ({clan.pendingRequests.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRequestsOpen(false)}
                  className="p-1.5 rounded-lg ui-dim hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1">
                {clan.pendingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-ui)' }}>
                        {req.user.avatarUrl ? (
                          <img src={req.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                            {req.user.username[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <UserDisplayName user={req.user} showClanTag={false} />
                        <span className="text-[10px] ui-dim block font-mono">
                          {req.user.classicPp || 0} PP • {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        {req.message && (
                          <p className="text-xs ui-dim mt-1.5 p-2 rounded-lg bg-black/10 dark:bg-white/5 border border-dashed border-white/10 italic">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleProcessRequest(req.id, 'approve')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcessRequest(req.id, 'reject')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 cursor-pointer"
                        title="Từ chối"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: TRANSFER LEADERSHIP */}
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="text-base font-bold ui-title flex items-center gap-2 text-amber-400">
                  <Crown className="w-5 h-5" /> Chuyển giao quyền sở hữu Clan
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="p-1.5 rounded-lg ui-dim hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs ui-dim leading-relaxed">
                  Chọn thành viên nhận chức vụ Leader tối cao của Clan. Bạn sẽ chuyển thành thành viên bình thường.
                </p>

                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs ui-input font-bold cursor-pointer"
                >
                  <option value="">-- Chọn thành viên nhận quyền --</option>
                  {allMembers
                    .filter((m: any) => m.userId !== clan.leaderId)
                    .map((m: any) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.username} ({m.role})
                      </option>
                    ))}
                </select>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!transferTargetId}
                    onClick={handleTransfer}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Crown className="w-4 h-4" /> Xác nhận chuyển giao
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CLAN SETTINGS */}
        {isSettingsOpen && (
          <ClanSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            clan={clan}
            onUpdated={() => loadClanData()}
            onDisbanded={() => router.push('/clan')}
            isLeader={isLeader}
            isAdminWeb={isAdminWeb}
            isOwnerWeb={isOwnerWeb}
          />
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
    </div>
  );
}
