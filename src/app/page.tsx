'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Megaphone, Heart, Crown, History, Plus, 
  ExternalLink, Trophy, ArrowRight, ArrowDownRight,
  Pin, Trash2
} from 'lucide-react';
import { HomeTopStats } from '@/components/home/HomeTopStats';
import { HomePostModal } from '@/components/home/HomePostModal';
import { HomePostPoll } from '@/components/home/HomePostPoll';

interface HomePost {
  id: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  levelGdId?: string | null;
  videoUrl?: string | null;
  poll?: any;
  isPinned: boolean;
  likedUserIds?: string[];
  createdAt: string;
  author: {
    username: string;
    role: string;
    avatarUrl?: string | null;
  };
}

interface Announcement {
  id: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  type: string;
  createdAt: string;
  author: {
    username: string;
  };
}

interface Supporter {
  id: string;
  username: string;
  avatarUrl?: string | null;
  clan?: {
    tag: string;
  } | null;
  supporterTotalMonths?: number;
  lastSupportedAt?: string;
}

interface LevelChangeLog {
  id: string;
  list: string;
  eventType: string;
  gdLevelId: number;
  levelName: string;
  oldPlacement?: number | null;
  newPlacement?: number | null;
  aboveLevelName?: string | null;
  belowLevelName?: string | null;
  details?: string | null;
  createdAt: string;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentSupporters, setRecentSupporters] = useState<Supporter[]>([]);
  const [topSupporters, setTopSupporters] = useState<Supporter[]>([]);
  const [changelogs, setChangelogs] = useState<LevelChangeLog[]>([]);
  const [highlights, setHighlights] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gdvnc_user');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const isAdminOrHigher = currentUser && ['ADMIN', 'SUPERADMIN', 'DEVELOPER'].includes(String(currentUser.role).toUpperCase());

  const fetchHomeData = async () => {
    try {
      const res = await fetch('/api/home', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setAnnouncements(data.announcements || []);
        setRecentSupporters(data.recentSupporters || []);
        setTopSupporters(data.topSupporters || []);
        setChangelogs(data.changelogs || []);
        setHighlights(data.highlights || null);
      }
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleDeletePost = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      const res = await fetch(`/api/home-posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('Không thể xóa bài viết');
      }
    } catch {
      alert('Lỗi kết nối khi xóa bài viết');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      alert('Vui lòng đăng nhập để thả tim bài viết!');
      return;
    }
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const currentLikes = targetPost.likedUserIds || [];
    const isLiked = currentLikes.includes(currentUser.id);
    const nextLikes = isLiked
      ? currentLikes.filter((uid) => uid !== currentUser.id)
      : [...currentLikes, currentUser.id];

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedUserIds: nextLikes } : p))
    );

    try {
      const res = await fetch(`/api/home-posts/${postId}/react`, { method: 'POST' });
      if (!res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likedUserIds: currentLikes } : p))
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likedUserIds: currentLikes } : p))
      );
    }
  };

  const getYoutubeEmbed = (url: string) => {
    try {
      const parsed = new URL(url);
      let id = '';
      if (parsed.hostname.includes('youtube.com')) {
        id = parsed.searchParams.get('v') || '';
      } else if (parsed.hostname.includes('youtu.be')) {
        id = parsed.pathname.slice(1);
      }
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1` : null;
    } catch {
      return null;
    }
  };

  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

  return (
    <div className="w-full space-y-6">
      
      {/* 1. TOP BANNER / SPOTLIGHT POST & ADMIN CREATE BUTTON */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight ui-title flex items-center gap-2">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
              Geometry Dash VN Community
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Cổng thông tin tin tức, cập nhật sự kiện, thành tích cộng đồng và bảng xếp hạng
            </p>
          </div>

          {isAdminOrHigher && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tạo bài đăng nổi bật
            </button>
          )}
        </div>

        {/* SPOTLIGHT POSTS */}
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => {
              const embedUrl = post.videoUrl ? getYoutubeEmbed(post.videoUrl) : null;
              return (
                <div
                  key={post.id}
                  className="ui-card p-5 sm:p-7 rounded-2xl relative overflow-hidden border border-border/50 bg-gradient-to-b from-card/90 to-card/50 shadow-md space-y-4"
                >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        {post.isPinned && (
                          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Pin className="w-3 h-3" /> Ghim
                          </span>
                        )}
                        <h2 className="text-xl sm:text-2xl font-black text-foreground drop-shadow-sm">
                          {post.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{post.author.username}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        {isAdminOrHigher && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 hover:text-red-400 text-muted-foreground transition-colors ml-2 cursor-pointer"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                      {post.body}
                    </div>

                    {/* LEVEL GD BADGE */}
                    {post.levelGdId && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm font-bold text-amber-400">
                        <span>GD Level ID:</span>
                        <code className="font-mono text-foreground font-black">{post.levelGdId}</code>
                      </div>
                    )}

                    {/* VIDEO EMBED */}
                    {embedUrl && (
                      <div className="aspect-video w-full max-w-3xl rounded-xl overflow-hidden border border-border/50 shadow">
                        <iframe
                          src={embedUrl}
                          title={post.title}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    )}

                    {/* POLL COMPONENT */}
                    {post.poll && (
                      <div className="pt-2 max-w-xl">
                        <HomePostPoll
                          postId={post.id}
                          poll={post.poll}
                          onVoted={(updatedPoll: any) => {
                            setPosts((prev) =>
                              prev.map((p) => (p.id === post.id ? { ...p, poll: updatedPoll } : p))
                            );
                          }}
                        />
                      </div>
                    )}

                    {/* FOOTER: LIKE BUTTON & EXTERNAL LINK */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-3 flex-wrap">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                          post.likedUserIds?.includes(currentUser?.id)
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/40 shadow-xs'
                            : 'bg-card/60 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border-border/40'
                        }`}
                        title="Thả tim bài viết"
                      >
                        <Heart className={`w-4 h-4 transition-transform ${post.likedUserIds?.includes(currentUser?.id) ? 'fill-current text-rose-500 scale-110' : ''}`} />
                        <span>{post.likedUserIds?.length || 0}</span>
                      </button>

                      {post.linkUrl && (
                        <a
                          href={post.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline ml-auto"
                        >
                          Xem chi tiết liên kết <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ui-card p-6 rounded-2xl text-center border border-border/40 text-muted-foreground text-sm">
              Chưa có bài viết nổi bật nào hôm nay.
            </div>
          )}
        </section>

      {/* 2. THÔNG BÁO MỚI NHẤT: 1 ITEM DUY NHẤT, KHÔNG CÓ TIÊU ĐỀ BOX, CHỈ HIỆN TIÊU ĐỀ */}
      {latestAnnouncement && (
        <Link
          href={`/announcements/${latestAnnouncement.id}`}
          className="ui-card p-3.5 sm:p-4 rounded-2xl border border-sky-500/30 hover:border-sky-500/60 bg-gradient-to-r from-sky-500/10 via-card/90 to-card/60 transition-all flex items-center justify-between gap-4 group shadow-xs select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-sky-400 transition-colors drop-shadow-xs truncate">
                {latestAnnouncement.title}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                • {new Date(latestAnnouncement.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-xs font-bold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span className="hidden sm:inline">Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      )}

      {/* 3. SUPPORTER MỚI NHẤT: TV NEWS TICKER / SLIDE DÀI NHƯ TIN NHANH TRUYỀN HÌNH */}
      {recentSupporters.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-card/90 to-pink-500/5 shadow-xs py-2 px-3 flex items-center gap-3 select-none">
          {/* Ticker Lead Tag */}
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500 text-white font-black text-[11px] uppercase tracking-wider shadow-sm z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Shoutout</span>
          </div>

          {/* Running marquee with smooth edge fade mask */}
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
            <div className="animate-news-ticker flex items-center gap-6 whitespace-nowrap">
              {[...recentSupporters, ...recentSupporters, ...recentSupporters].map((s, idx) => (
                <Link
                  key={`${s.id}-${idx}`}
                  href={`/profile/${encodeURIComponent(s.username)}`}
                  className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center font-bold text-[10px] text-pink-400 shrink-0 overflow-hidden">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={s.username} className="w-full h-full object-cover" />
                    ) : (
                      s.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-pink-400 transition-colors">
                    {s.clan?.tag && <span className="text-muted-foreground mr-1">[{s.clan.tag}]</span>}
                    {s.username}
                  </span>
                  <span className="text-[11px] text-pink-400 font-bold">
                    ({s.supporterTotalMonths || 1} tháng)
                  </span>
                  <span className="text-muted-foreground/30 font-bold ml-2">•</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Support link CTA */}
          <Link
            href="/support"
            className="shrink-0 text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1 z-10 pl-2 whitespace-nowrap hidden sm:flex"
          >
            <span>Ủng hộ</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* 4. ĐIỂM NHẤN BẢNG XẾP HẠNG: BỎ TIÊU ĐỀ */}
      <section>
        <HomeTopStats highlights={highlights} />
      </section>

      {/* 5. 2-COLUMN SECTION: CHANGELOG & SUPPORTER VINH DANH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NHẬT KÝ THAY ĐỔI DANH SÁCH LEVEL */}
        <section className="ui-card p-5 sm:p-6 rounded-2xl border border-border/50 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Nhật Ký Thay Đổi Danh Sách
              </h3>
              <Link
                href="/changelog"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 group"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="space-y-2">
              {changelogs.length > 0 ? (
                changelogs.slice(0, 4).map((log, idx) => {
                  const listBadge =
                    log.list === 'PEMON'
                      ? { label: 'Platformer', class: 'bg-sky-500/15 text-sky-400 border-sky-500/30' }
                      : log.list === 'CHALLENGE'
                      ? { label: 'Challenge', class: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
                      : { label: 'Demon List', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };

                  const isAdded = log.eventType === 'LEVEL_ADDED';
                  const isRemoved = log.eventType === 'LEVEL_REMOVED' || log.eventType === 'LEVEL_DROPPED';

                  return (
                    <div
                      key={log.id || idx}
                      className="p-2.5 sm:p-3 rounded-xl bg-card/60 hover:bg-card/90 transition-all border border-border/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Event Icon */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isRemoved
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {isAdded ? (
                            <Plus className="w-4 h-4" />
                          ) : isRemoved ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${listBadge.class}`}>
                              {listBadge.label}
                            </span>
                            <Link
                              href={`/levels/${log.gdLevelId}`}
                              className="text-xs sm:text-sm font-bold text-foreground hover:text-emerald-400 transition-colors truncate"
                            >
                              {log.levelName}
                            </Link>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {isAdded && log.newPlacement && (
                              <span className="text-emerald-400 font-bold">Thêm vào Top #{log.newPlacement}</span>
                            )}
                            {isRemoved && (
                              <span className="text-rose-400 font-bold">Rời khỏi danh sách</span>
                            )}
                            {log.details && <span className="ml-1 text-muted-foreground/80">• {log.details}</span>}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Chưa có nhật ký thay đổi danh sách nào gần đây.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* NGƯỜI ĐÓNG NHIỀU SUPPORTER NHẤT (BEST SUPPORT) */}
        <section className="ui-card p-5 sm:p-6 rounded-2xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2 text-pink-400">
              <Heart className="w-5 h-5 text-pink-400 fill-pink-400/20" />
              Best Support
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Những thành viên có thời gian gắn bó và ủng hộ duy trì máy chủ nhiều nhất.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {topSupporters.length > 0 ? (
              topSupporters.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/profile/${encodeURIComponent(s.username)}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/60 hover:bg-card/90 transition-all border border-border/40 group relative overflow-hidden"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xs shrink-0 overflow-hidden">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={s.username} className="w-full h-full object-cover" />
                    ) : (
                      `#${idx + 1}`
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate group-hover:text-amber-400 transition-colors">
                      {s.clan?.tag && <span className="text-muted-foreground mr-1">[{s.clan.tag}]</span>}
                      {s.username}
                    </div>
                    <div className="text-[10px] font-semibold text-amber-400">
                      {s.supporterTotalMonths || 1} tháng support
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center text-xs text-muted-foreground py-4">
                Chưa có dữ liệu vinh danh.
              </div>
            )}
          </div>
        </section>

      </div>

      {/* POST CREATION MODAL */}
      {isModalOpen && (
        <HomePostModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={(newPost: any) => {
            setPosts((prev) => [newPost, ...prev]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
