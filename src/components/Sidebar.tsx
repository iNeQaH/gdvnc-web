'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Star, 
  Folder, 
  Goal,
  BookOpen,
  ClipboardList,
  Send, 
  ShieldCheck, 
  User as UserIcon, 
  Settings, 
  Heart, 
  Menu, 
  X,
  History,
  Mail,
  Bell,
  ScrollText,
  Crown,
  Shield,
  Users,
  Copy,
  ChevronDown,
  Gamepad2,
  Crosshair,
  Wrench,
  Flame,
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageContext';
import BrandMark from '@/components/BrandMark';
import { NotificationModal } from './NotificationModal';
import { UserDisplayName } from './UserDisplayName';
import { EasterEggOverlay } from './EasterEggOverlay';
import { isStaffRole, isSuperAdminUser } from '@/lib/roles';
import { refreshSessionUser, logoutClient } from '@/lib/sessionClient';
import { useToast } from '@/components/GlobalToast';

export const Sidebar = () => {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const isLavender = theme === 'lavender';
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announceUnread, setAnnounceUnread] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Easter Egg state on homepage top-left logo button (5 -> 15 -> 25 clicks)
  const eggClicksRef = React.useRef(0);
  const eggTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [eggAlertMessage, setEggAlertMessage] = useState<string | null>(null);
  const [isEggOverlayOpen, setIsEggOverlayOpen] = useState(false);

  const isLbActive = pathname === '/' || pathname.startsWith('/leaderboard');
  const isLvlActive = pathname.startsWith('/levels');
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(isLbActive);
  const [levelsExpanded, setLevelsExpanded] = useState(isLvlActive && !isLbActive);
  const [lastClickedAccordion, setLastClickedAccordion] = useState<'lb' | 'lvl' | null>(() => {
    if (isLbActive) return 'lb';
    if (isLvlActive) return 'lvl';
    return null;
  });

  const prevPathnameRef = React.useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isLbActive) {
        setLeaderboardExpanded(true);
        setLevelsExpanded(false);
        setLastClickedAccordion('lb');
      } else if (isLvlActive) {
        setLevelsExpanded(true);
        setLeaderboardExpanded(false);
        setLastClickedAccordion('lvl');
      } else {
        // Tự động thu gọn (collapse) cả Bảng xếp hạng và Danh sách level khi chuyển sang các trang khác
        setLeaderboardExpanded(false);
        setLevelsExpanded(false);
        setLastClickedAccordion(null);
      }
    }
  }, [pathname, isLbActive, isLvlActive]);

  useEffect(() => {
    eggClicksRef.current = 0;
    setEggAlertMessage(null);
    setIsEggOverlayOpen(false);
  }, [pathname]);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== '/') return;
    if (!currentUser) return;

    e.preventDefault();
    if (eggAlertMessage !== null) return;

    if (eggTimerRef.current) {
      clearTimeout(eggTimerRef.current);
    }

    const next = eggClicksRef.current + 1;
    eggClicksRef.current = next;

    const hasEggCode = Boolean(
      currentUser?.easterEggCode ||
      currentUser?.easterEggCompleted ||
      (currentUser?.easterEggPoints ?? 0) >= 100
    );

    // Sau khi server gửi mã rồi (kể cả chưa đổi): khi nhấn 5 lần thì báo mã đổi thưởng và loop ở đó
    if (hasEggCode) {
      if (next >= 5) {
        eggClicksRef.current = 0; // Loop ở đó! Không bao giờ lên 15 hay 25
        const currentCode = currentUser?.easterEggCode;
        if (currentCode) {
          setEggAlertMessage(currentCode);
        } else {
          fetch('/api/easter-egg')
            .then((res) => res.json())
            .then((data) => {
              const code = data?.code;
              if (code) {
                try {
                  const raw = localStorage.getItem('gdvnc_user');
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    localStorage.setItem('gdvnc_user', JSON.stringify({ ...parsed, easterEggCode: code, easterEggCompleted: true }));
                    setCurrentUser({ ...parsed, easterEggCode: code, easterEggCompleted: true });
                  }
                } catch {}
                setEggAlertMessage(code);
              } else {
                setEggAlertMessage('Đã mở khoá');
              }
            })
            .catch(() => {
              setEggAlertMessage('Đã mở khoá');
            });
        }
        return;
      }

      eggTimerRef.current = setTimeout(() => {
        eggClicksRef.current = 0;
      }, 4000);
      return;
    }

    if (next === 5) {
      setEggAlertMessage('Làm j v?');
      return;
    }
    if (next === 15) {
      setEggAlertMessage('...');
      return;
    }
    if (next >= 25) {
      eggClicksRef.current = 0;
      setIsOpen(false);
      setIsEggOverlayOpen(true);
      return;
    }

    eggTimerRef.current = setTimeout(() => {
      eggClicksRef.current = 0;
    }, 4000);
  };

  const handleCloseEggAlert = () => {
    setEggAlertMessage(null);
    if (eggTimerRef.current) {
      clearTimeout(eggTimerRef.current);
    }
    eggTimerRef.current = setTimeout(() => {
      eggClicksRef.current = 0;
    }, 6000);
  };

  const navRef = React.useRef<HTMLElement>(null);

  const handleUpdateUnreadCount = (count: number) => {
    const newCount = Math.max(0, count);
    setUnreadCount(newCount);
    try {
      const uStr = localStorage.getItem('gdvnc_user');
      if (uStr) {
        const u = JSON.parse(uStr);
        const raw = sessionStorage.getItem('gdvnc_badges');
        const cached = raw ? JSON.parse(raw) : {};
        sessionStorage.setItem(
          'gdvnc_badges',
          JSON.stringify({
            ...cached,
            userId: u.id,
            at: Date.now(),
            unreadCount: newCount,
          })
        );
      }
    } catch {
      /* ignore */
    }
  };

  const loadUserFromStorage = () => {
    const userStr = localStorage.getItem('gdvnc_user');
    let u = null;
    if (userStr) {
      try {
        u = JSON.parse(userStr);
        setCurrentUser(u);
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    } else {
      setCurrentUser(null);
      setUnreadCount(0);
      setAnnounceUnread(0);
    }

    const override = typeof window !== 'undefined' ? (window as any).__profileOverride : null;
    const customThemeColor = override && override.customThemeColor !== undefined ? override.customThemeColor : u?.profileConfig?.customThemeColor;
    const backgroundUrl = override && override.backgroundUrl !== undefined ? override.backgroundUrl : u?.profileConfig?.backgroundUrl;

    // Custom theme variables are managed by ThemeProvider (only applied when theme is 'custom')


    if (backgroundUrl) {
      document.body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(" + backgroundUrl + ")";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
    } else {
      document.body.style.removeProperty('background-image');
      document.body.style.removeProperty('background-size');
      document.body.style.removeProperty('background-position');
      document.body.style.removeProperty('background-attachment');
    }

    if (u) {
      let usedCache = false;
      try {
        const raw = sessionStorage.getItem('gdvnc_badges');
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached?.userId === u.id && Date.now() - cached.at < 90_000) {
            setUnreadCount(cached.unreadCount || 0);
            setAnnounceUnread(cached.announceUnread || 0);
            usedCache = true;
          }
        }
      } catch {
        /* ignore */
      }
      if (usedCache) return;
      Promise.all([
        fetch('/api/notifications').then((res) => res.json()),
        fetch('/api/announcements').then((res) => res.json()),
      ])
        .then(([inbox, announces]) => {
          const unread = inbox?.success ? inbox.unreadCount || 0 : 0;
          const announce = announces?.success ? announces.unreadCount || 0 : 0;
          setUnreadCount(unread);
          setAnnounceUnread(announce);
          try {
            sessionStorage.setItem(
              'gdvnc_badges',
              JSON.stringify({ userId: u.id, at: Date.now(), unreadCount: unread, announceUnread: announce })
            );
          } catch {
            /* ignore */
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    void refreshSessionUser();
    window.addEventListener('gdvnc_user_update', loadUserFromStorage);

    return () => {
      window.removeEventListener('gdvnc_user_update', loadUserFromStorage);
    };
  }, []);

  // Connect real-time SSE stream only for logged-in users to save server sockets/memory
  useEffect(() => {
    if (!currentUser?.id) return;

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/stream');
      es.addEventListener('notification', () => {
        try {
          sessionStorage.removeItem('gdvnc_badges');
        } catch {
          /* ignore */
        }
        loadUserFromStorage();
      });
    } catch {
      /* ignore */
    }

    return () => {
      if (es) es.close();
    };
  }, [currentUser?.id]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('gdvnc-sidebar-open', isOpen);
    return () => document.documentElement.classList.remove('gdvnc-sidebar-open');
  }, [isOpen]);

  const handleLogout = async () => {
    await logoutClient();
    window.location.href = '/';
  };

  useEffect(() => {
    try {
      localStorage.removeItem('gdvnc_ui_scale');
      (document.documentElement.style as any).zoom = '';
    } catch {
      /* ignore */
    }
  }, []);

  const leaderboardSubLinks = [
    { href: '/leaderboard/classic', label: t('leaderboard.classic') || 'Classic', match: (p: string) => p === '/' || p === '/leaderboard' || p === '/leaderboard/classic' },
    { href: '/leaderboard/platformer', label: t('leaderboard.platformer') || 'Platformer', match: (p: string) => p === '/leaderboard/platformer' },
    { href: '/leaderboard/challenge', label: t('tags.challenge') || 'Challenge', match: (p: string) => p === '/leaderboard/challenge' },
    { href: '/leaderboard/creator', label: t('leaderboard.creator') || 'Creator', match: (p: string) => p === '/leaderboard/creator' },
    { href: '/leaderboard/stars', label: 'Stars', match: (p: string) => p === '/leaderboard/stars' },
    { href: '/leaderboard/moons', label: 'Moons', match: (p: string) => p === '/leaderboard/moons' },
    { href: '/leaderboard/demons', label: 'Demons', match: (p: string) => p === '/leaderboard/demons' },
  ];

  const levelsSubLinks = [
    { href: '/levels/featured', label: 'Featured List', match: (p: string) => p === '/levels' || p === '/levels/featured' || p === '/levels/feature-list' },
    { href: '/levels/classic', label: 'Classic List', match: (p: string) => p === '/levels/classic' },
    { href: '/levels/demonlist', label: 'Demon List', match: (p: string) => p === '/levels/demonlist' },
    { href: '/levels/pemonlist', label: 'Pemon List', match: (p: string) => p === '/levels/pemonlist' },
    { href: '/levels/vn', label: 'Made in VN', match: (p: string) => p === '/levels/vn' },
    { href: '/levels/challenge', label: 'Challenge List', match: (p: string) => p === '/levels/challenge' },
  ];

  const navLinks = [
    { href: '/announcements', label: t('nav.announcements'), icon: Bell },
    { href: '/', label: t('nav.leaderboard'), icon: Star },
    { href: '/levels', label: t('nav.demonlist'), icon: Folder },
    { href: '/clan', label: t('nav.clan') || 'Clan', icon: Users },
    { href: '/changelog', label: t('nav.changelog'), icon: ScrollText },
    { href: '/guidelines', label: t('nav.guidelines'), icon: BookOpen },
    // { href: '/timeline', label: t('nav.timeline'), icon: History },
    { href: '/submit', label: t('nav.submit'), icon: ClipboardList },
    { href: '/support', label: t('nav.supporter'), icon: Heart, highlight: false, isPink: true },
    { href: '/helps', label: t('nav.helps'), icon: Send},
    ...(isStaffRole(currentUser?.role) ? [{ href: '/admin/records', label: t('nav.admin'), icon: ShieldCheck }] : []),
  ];

  if (pathname === '/easter-egg') {
    return null;
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <header
        className="md:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between border-b backdrop-blur-md"
        style={{
          backgroundColor: ((typeof window !== 'undefined' ? (window as any).__profileOverride?.backgroundUrl : undefined) ?? currentUser?.profileConfig?.backgroundUrl) ? 'rgba(0, 0, 0, 0.7)' : 'var(--bg-card)',
          borderColor: isLavender ? undefined : "var(--border-ui)",
        }}
      >
        <Link
          href="/"
          onClick={handleLogoClick}
          className={`flex items-center gap-2 px-2 py-1 rounded-xl select-none transition-all cursor-pointer ${isLavender ? 'tsumiki-btn' : 'active:scale-95'}`}
        >
          <BrandMark size={28} className="rounded-lg" />
          <span className="font-black text-sm tracking-tight ui-title">
            GD<span style={{ color: 'var(--accent)' }}>VN</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl border ui-dim hover:opacity-100 transition-colors"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: isLavender ? undefined : "var(--border-ui)" }}
            aria-label="Menu"
          >
            {isOpen ? <X className="w-4 h-4 ui-title" /> : <Menu className="w-4 h-4 ui-title" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar (Desktop Fixed & Mobile Slide-in Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between p-4 overflow-y-auto overflow-x-hidden border-r backdrop-blur-xl transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          backgroundColor: ((typeof window !== 'undefined' ? (window as any).__profileOverride?.backgroundUrl : undefined) ?? currentUser?.profileConfig?.backgroundUrl) ? 'color-mix(in srgb, var(--bg-card) 70%, transparent)' : 'var(--bg-card)',
          borderColor: isLavender ? undefined : "var(--border-ui)",
        }}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link
              href="/"
              onClick={handleLogoClick}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl select-none transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 ${isLavender ? 'tsumiki-btn' : 'active:scale-95'}`}
            >
              <BrandMark size={36} />
              <div>
                <div className={`font-extrabold text-base tracking-tight leading-tight ${isLavender ? 'text-indigo-950 dark:text-white' : 'ui-title'}`}>
                  GD<span style={{ color: isLavender ? '#4338ca' : 'var(--accent)' }}>VN</span>
                </div>
                <div
                  className={`text-[10px] font-bold leading-none mt-0.5 tracking-tight ${isLavender ? 'text-indigo-950 dark:text-white' : 'ui-title'}`}
                >
                  Geometry Dash Vietnam
                </div>
              </div>
            </Link>

            {/* Close button on mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 rounded-lg ui-dim hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="relative space-y-1" ref={navRef}>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider ui-dim relative z-[2]">
              {t('nav.menu')}
            </div>

            {navLinks.map((item) => {
              const Icon = item.icon;
              const myClan = currentUser?.clanMember?.clan;
              const isMyClanActive = myClan && pathname === `/clan/${myClan.slug}`;
              const isAccordion = item.href === '/' || item.href === '/levels';
              const isExpanded = item.href === '/' ? leaderboardExpanded : item.href === '/levels' ? levelsExpanded : false;
              const isActive =
                item.href === '/'
                  ? (isLbActive || (lastClickedAccordion === 'lb' && leaderboardExpanded))
                  : item.href === '/levels'
                  ? (isLvlActive || (lastClickedAccordion === 'lvl' && levelsExpanded))
                  : (item.href === '/clan' && isMyClanActive)
                  ? false
                  : pathname === item.href || (pathname.startsWith(item.href + '/') && !isMyClanActive);

              const handleItemClick = (e: React.MouseEvent) => {
                e.preventDefault();
                if (item.href === '/') {
                  if (!leaderboardExpanded) {
                    setLevelsExpanded(false);
                    setLeaderboardExpanded(true);
                    setLastClickedAccordion('lb');
                    if (!isLbActive) {
                      router.push('/leaderboard/classic');
                      setIsOpen(false);
                    }
                  } else {
                    setLeaderboardExpanded(false);
                  }
                } else if (item.href === '/levels') {
                  if (!levelsExpanded) {
                    setLeaderboardExpanded(false);
                    setLevelsExpanded(true);
                    setLastClickedAccordion('lvl');
                    if (!isLvlActive) {
                      router.push('/levels/featured');
                      setIsOpen(false);
                    }
                  } else {
                    setLevelsExpanded(false);
                  }
                }
              };

              // Class name & Style cho từng loại nav item:
              // Khử hoàn toàn lỗi chữ trắng trên nền trắng (white on white), đảm bảo độ tương phản cao tuyệt đối
              // Giữ nguyên nút 3D (tsumiki-btn / active bg) khi active cho dù đang expand hay collapse
              const getItemClassName = () => {
                const base = "w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group z-[2] text-left cursor-pointer";
                if (isActive) {
                  if (isLavender) {
                    return `${base} tsumiki-btn shadow-sm !text-indigo-950 dark:!text-white`;
                  }
                  return `${base} bg-[var(--accent-bg)] text-[var(--accent-text)] font-bold`;
                }
                if (isAccordion && isExpanded) {
                  return `${base} ${
                    isLavender
                      ? (isDark ? 'bg-white/10 text-white font-bold' : 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200/60')
                      : 'bg-[var(--bg-subtle)] text-[var(--text-title)] font-bold'
                  }`;
                }
                if (item.isPink) {
                  return `${base} text-pink-500 dark:text-pink-400 hover:bg-pink-500/10`;
                }
                if (isLavender) {
                  return `${base} text-indigo-950/70 dark:text-indigo-200/70 hover:text-indigo-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5`;
                }
                return `${base} text-[var(--text-body)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-title)]`;
              };

              return (
                <React.Fragment key={item.href}>
                  {isAccordion ? (
                    <button
                      type="button"
                      onClick={handleItemClick}
                      className={getItemClassName()}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-transform ${isActive || isExpanded ? 'scale-110' : 'group-hover:scale-110'} ${item.href === '/' ? 'text-amber-500' : 'text-sky-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 opacity-100' : 'opacity-60'}`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => {
                        setLeaderboardExpanded(false);
                        setLevelsExpanded(false);
                        setLastClickedAccordion(null);
                      }}
                      className={getItemClassName()}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${item.isPink ? 'text-pink-400' : ''}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.href === '/announcements' && announceUnread > 0 ? (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {announceUnread > 9 ? '9+' : announceUnread}
                        </span>
                      ) : null}
                    </Link>
                  )}

                  {/* Leaderboard sub-links accordion with smooth CSS grid transition */}
                  {item.href === '/' && (
                    <div
                      className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
                      style={{
                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                        opacity: isExpanded ? 1 : 0,
                        marginTop: isExpanded ? '4px' : '0px',
                        marginBottom: isExpanded ? '4px' : '0px',
                      }}
                    >
                      <div className="min-h-0 ml-5 pl-2.5 space-y-0.5 border-l-2" style={{ borderColor: isLavender ? (isDark ? '#4c1d95' : '#c7d2fe') : 'var(--border-subtle)' }}>
                        {leaderboardSubLinks.map((sub) => {
                          const isSubActive = sub.match(pathname);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isSubActive
                                  ? isLavender
                                    ? (isDark
                                        ? 'bg-purple-900/50 text-purple-200 font-bold shadow-xs border border-purple-500/30'
                                        : 'bg-indigo-100 text-indigo-950 font-bold shadow-xs border border-indigo-200')
                                    : 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-bold'
                                  : isLavender
                                  ? (isDark ? 'text-indigo-300/70 hover:text-indigo-100 hover:bg-white/5' : 'text-indigo-950/70 hover:text-indigo-950 hover:bg-indigo-50')
                                  : 'ui-dim hover:text-inherit hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: isSubActive
                                    ? isLavender
                                      ? (isDark ? '#c084fc' : '#4338ca')
                                      : 'var(--accent)'
                                    : 'currentColor',
                                  opacity: isSubActive ? 1 : 0.4
                                }}
                              />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Levels sub-links accordion with smooth CSS grid transition */}
                  {item.href === '/levels' && (
                    <div
                      className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
                      style={{
                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                        opacity: isExpanded ? 1 : 0,
                        marginTop: isExpanded ? '4px' : '0px',
                        marginBottom: isExpanded ? '4px' : '0px',
                      }}
                    >
                      <div className="min-h-0 ml-5 pl-2.5 space-y-0.5 border-l-2" style={{ borderColor: isLavender ? (isDark ? '#4c1d95' : '#c7d2fe') : 'var(--border-subtle)' }}>
                        {levelsSubLinks.map((sub) => {
                          const isSubActive = sub.match(pathname);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isSubActive
                                  ? isLavender
                                    ? (isDark
                                        ? 'bg-purple-900/50 text-purple-200 font-bold shadow-xs border border-purple-500/30'
                                        : 'bg-indigo-100 text-indigo-950 font-bold shadow-xs border border-indigo-200')
                                    : 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-bold'
                                  : isLavender
                                  ? (isDark ? 'text-indigo-300/70 hover:text-indigo-100 hover:bg-white/5' : 'text-indigo-950/70 hover:text-indigo-950 hover:bg-indigo-50')
                                  : 'ui-dim hover:text-inherit hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: isSubActive
                                    ? isLavender
                                      ? (isDark ? '#c084fc' : '#4338ca')
                                      : 'var(--accent)'
                                    : 'currentColor',
                                  opacity: isSubActive ? 1 : 0.4
                                }}
                              />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Joined Clan Sub-item */}
                  {item.href === '/clan' && myClan && (
                    <Link
                      href={`/clan/${myClan.slug}`}
                      onClick={() => {
                        setLeaderboardExpanded(false);
                        setLevelsExpanded(false);
                        setLastClickedAccordion(null);
                      }}
                      className={`relative flex items-center justify-between ml-5 px-3 py-2 rounded-xl text-xs font-bold transition-all group z-[2] ${
                        isMyClanActive
                          ? isLavender
                            ? 'tsumiki-btn shadow-sm !text-indigo-950 dark:!text-white'
                            : 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-bold shadow-xs'
                          : 'shadow-xs hover:opacity-90'
                      }`}
                      style={
                        !isMyClanActive
                          ? {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : isLavender
                                ? 'rgba(67, 56, 202, 0.12)'
                                : 'color-mix(in srgb, var(--accent) 15%, var(--bg-card))',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="font-mono font-black text-xs shrink-0 px-1 py-0.5 rounded bg-black/10 dark:bg-black/30"
                          style={
                            myClan.colorGradient && ((myClan as any).tier === undefined || (myClan as any).tier >= 2)
                              ? {
                                  backgroundImage: myClan.colorGradient,
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }
                              : { color: myClan.color || '#f59e0b' }
                          }
                        >
                          {myClan.tag?.startsWith('[') ? myClan.tag : `[${myClan.tag}]`}
                        </span>
                        <span
                          className={`text-xs truncate font-black tracking-tight drop-shadow-xs ${
                            isDark ? 'text-white' : 'text-slate-950'
                          }`}
                          style={{ color: isDark ? '#ffffff' : '#020617' }}
                        >
                          {myClan.name}
                        </span>
                      </div>
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area, Language, Theme & Zoom Controls */}
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 px-1 w-full">
            <button
              type="button"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              aria-label={t('sidebar.language')}
              className={`h-9 flex-1 min-w-0 rounded-xl border text-[11px] font-bold font-sans leading-none cursor-pointer focus:outline-none flex items-center justify-center appearance-none p-0 ${isLavender ? 'tsumiki-btn' : ''}`}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: isLavender ? undefined : "var(--border-ui)",
                color: isLavender ? undefined : "var(--text-title)",
                WebkitAppearance: 'none',
              }}
            >
              {language === 'en' ? 'EN' : 'VI'}
            </button>
            {currentUser && (
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsInboxOpen(true)}
                  className={`w-full h-9 rounded-xl border relative cursor-pointer hover:opacity-90 flex items-center justify-center ${isLavender ? 'tsumiki-btn !m-0 !mb-0' : ''}`}
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: isLavender ? undefined : "var(--border-ui)", color: isLavender ? undefined : "var(--text-title)" }}
                  title="Inbox"
                >
                  <Mail className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs pointer-events-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}
          </div>


          <div className="flex items-center gap-2 px-1 pb-1">
            <span className="text-[11px] font-medium ui-dim shrink-0 leading-none">{t('sidebar.theme')}</span>
            <div className="min-w-0 flex-1">
              <ThemeSwitcher dropUp />
            </div>
          </div>

          {/* User Status Card */}
          {currentUser ? (
            <div className="p-2.5 mt-2 rounded-2xl border flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: isLavender ? undefined : "var(--border-ui)" }}>
              <Link
                href={`/profile/${currentUser.username}`}
                className="group flex items-center gap-2.5 min-w-0 flex-1 hover:brightness-105 transition-all"
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-[color:var(--accent-fg)] font-bold shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
                    {currentUser.username[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs ui-title truncate flex items-center gap-1">
                    <UserDisplayName
                      user={currentUser}
                      fallbackName={currentUser.username}
                      showClanTag={true}
                      tagPosition="left"
                      showClanRole={false}
                      wrap={false}
                      className="text-xs"
                    />
                  </div>
                  <div className="text-[10px] ui-dim flex items-center gap-1">
                    {currentUser.isSuperAdmin || isSuperAdminUser(currentUser) ? (
                      <span className="text-rose-500 font-bold flex items-center gap-1"><Crown className="w-3 h-3 text-rose-500 fill-rose-500" /> Owner</span>
                    ) : currentUser.role === 'ADMIN' ? (
                      <span className="text-rose-500 font-bold flex items-center gap-1"><Shield className="w-3 h-3 text-rose-500" /> Admin</span>
                    ) : currentUser.role === 'MODERATOR' ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Mod</span>
                    ) : currentUser.supporterUntil && new Date(currentUser.supporterUntil) > new Date() ? (
                      <span className="text-pink-500 font-bold flex items-center gap-1"><Heart className="w-3 h-3 fill-pink-500" /> Supporter</span>
                    ) : (
                      <span>{t('nav.profile')}</span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <Link
                  href="/settings"
                  title="Cài đặt cá nhân"
                  className={`p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors cursor-pointer ${isLavender ? 'tsumiki-btn' : ''}`}
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className={`px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${isLavender ? 'tsumiki-btn' : ''}`}
              style={{ backgroundColor: "var(--accent)" }}
            >
              <UserIcon className="w-3.5 h-3.5" />
              {t('nav.login')}
            </Link>
          )}
        </div>
      </aside>

      {currentUser && (
        <NotificationModal
          userId={currentUser.id}
          isOpen={isInboxOpen}
          onClose={() => setIsInboxOpen(false)}
          onUpdateUnreadCount={handleUpdateUnreadCount}
        />
      )}

      {eggAlertMessage !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className="relative w-full max-w-xs rounded-2xl border p-6 shadow-2xl flex items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
            }}
          >
            <div className="min-w-0 flex-1">
              {eggAlertMessage !== 'Làm j v?' && eggAlertMessage !== '...' ? (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider ui-dim mb-1">
                    Mã đổi thưởng
                  </div>
                  <div
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(eggAlertMessage);
                        showToast('Đã sao chép mã đổi thưởng!', 'success');
                      }
                    }}
                    className="text-xl font-black font-mono tracking-widest text-violet-400 select-all cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
                    title="Click để sao chép mã"
                  >
                    <span>{eggAlertMessage}</span>
                    <Copy className="w-4 h-4 ui-dim shrink-0" />
                  </div>
                </div>
              ) : (
                <div className="text-base font-bold ui-title select-none">
                  {eggAlertMessage}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseEggAlert}
              aria-label="Đóng"
              className="p-1.5 rounded-lg border ui-dim hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <X className="w-4 h-4 ui-title" />
            </button>
          </div>
        </div>
      )}

      {/* Easter Egg Fullscreen Overlay (Covers everything on homepage, reset on reload) */}
      {isEggOverlayOpen && !currentUser?.easterEggCode && !currentUser?.easterEggCompleted && (currentUser?.easterEggPoints ?? 0) < 100 && (
        <EasterEggOverlay onClose={() => setIsEggOverlayOpen(false)} />
      )}
    </>
  );
};








