'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ZoomIn,
  History,
  Mail,
  Bell,
  ScrollText,
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageContext';
import BrandMark from '@/components/BrandMark';
import { NotificationModal } from './NotificationModal';
import { isStaffRole } from '@/lib/roles';
import { refreshSessionUser, logoutClient } from '@/lib/sessionClient';

export const Sidebar = () => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLavender = theme === 'lavender';
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announceUnread, setAnnounceUnread] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const navRef = React.useRef<HTMLElement>(null);
  const activeLinkRef = React.useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isLavender && activeLinkRef.current && navRef.current) {
      setIndicatorStyle({
        top: activeLinkRef.current.offsetTop,
        height: activeLinkRef.current.offsetHeight,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [pathname, isLavender]);

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
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        if (u?.profileConfig?.backgroundUrl) {
          document.body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(" + u.profileConfig.backgroundUrl + ")";
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          document.body.style.backgroundAttachment = "fixed";
        } else { document.body.style.backgroundImage = "none"; }
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
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    } else {
      setCurrentUser(null);
      setUnreadCount(0);
      setAnnounceUnread(0);
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    void refreshSessionUser();
    window.addEventListener('gdvnc_user_update', loadUserFromStorage);

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
      window.removeEventListener('gdvnc_user_update', loadUserFromStorage);
      if (es) es.close();
    };
  }, []);

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

  const [uiScale, setUiScale] = useState<number>(100);

  useEffect(() => {
    const savedScale = localStorage.getItem('gdvnc_ui_scale');
    if (savedScale) {
      const s = parseInt(savedScale);
      if (!isNaN(s)) {
        setUiScale(s);
        // Only apply zoom on desktop
        if (window.innerWidth >= 768) {
          (document.documentElement.style as any).zoom = `${s}%`;
        }
      }
    }
  }, []);

  const handleScaleChange = (val: number) => {
    setUiScale(val);
    // Only apply zoom on larger screens; mobile uses normal layout
    if (window.innerWidth >= 768) {
      (document.documentElement.style as any).zoom = `${val}%`;
    }
    localStorage.setItem('gdvnc_ui_scale', val.toString());
  };

  const navLinks = [
    { href: '/announcements', label: t('nav.announcements'), icon: Bell },
    { href: '/', label: t('nav.leaderboard'), icon: Star },
    { href: '/levels', label: t('nav.demonlist'), icon: Folder },
    { href: '/changelog', label: t('nav.changelog'), icon: ScrollText },
    { href: '/guidelines', label: t('nav.guidelines'), icon: BookOpen },
    // { href: '/timeline', label: t('nav.timeline'), icon: History },
    { href: '/submit', label: t('nav.submit'), icon: ClipboardList },
    { href: '/support', label: t('nav.supporter'), icon: Heart, highlight: false, isPink: true },
    { href: '/helps', label: t('nav.helps'), icon: Send},
    ...(isStaffRole(currentUser?.role) ? [{ href: '/admin/records', label: t('nav.admin'), icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <header
        className="md:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: isLavender ? undefined : "var(--border-ui)",
        }}
      >
        <Link href="/" className="flex items-center gap-2">
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between p-4 overflow-y-auto overflow-x-hidden border-r transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: isLavender ? undefined : "var(--border-ui)",
        }}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={36} />
              <div>
                <div className="font-extrabold text-base tracking-tight ui-title leading-tight">
                  GD<span style={{ color: 'var(--accent)' }}>VN</span>
                </div>
                <div className="text-[10px] ui-dim font-medium">Geometry Dash Vietnam</div>
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

            {isLavender && (
              <div 
                className={`absolute rounded-xl z-[1] transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] tsumiki-indicator ${pathname === "/support" ? "tsumiki-indicator-pink" : ""} ${indicatorStyle.opacity ? "opacity-100" : "opacity-0"}`}
                style={{ 
                  left: '0', 
                  right: '0',
                  top: `${indicatorStyle.top}px`,
                  height: `${indicatorStyle.height}px`,
                  pointerEvents: 'none'
                }}
              >
                <span className="tsumiki-front !rounded-xl" style={{ transform: 'translateY(-3px)' }} />
              </div>
            )}

            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              const actualBgCol = isLavender ? 'transparent' : (isActive ? 'var(--accent-bg)' : 'transparent');
              const actualTextCol = isLavender && isActive ? '#ffffff' : (item.isPink ? '#f472b6' : (isActive ? 'var(--accent-text)' : 'var(--text-body)'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={isActive ? activeLinkRef : null}
                  className={`relative flex items-center justify-between px-3 py-3 rounded-xl text-xs font-semibold transition-all group z-[2] ${isLavender && isActive ? '-translate-y-[7px]' : ''}`}
                  style={{
                    backgroundColor: actualBgCol,
                    color: actualTextCol,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform ${item.isPink ? 'text-pink-400' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.href === '/announcements' && announceUnread > 0 ? (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {announceUnread > 9 ? '9+' : announceUnread}
                    </span>
                  ) : null}
                </Link>
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
              <button
                onClick={() => setIsInboxOpen(true)}
                className={`h-9 flex-1 min-w-0 rounded-xl border relative cursor-pointer hover:opacity-90 flex items-center justify-center ${isLavender ? 'tsumiki-btn' : ''}`}
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: isLavender ? undefined : "var(--border-ui)", color: isLavender ? undefined : "var(--text-title)" }}
                title="Inbox"
              >
                <Mail className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-medium ui-dim flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" />
              {t('sidebar.zoom')}
            </span>
            <select
              value={uiScale}
              onChange={(e) => handleScaleChange(parseInt(e.target.value))}
              className={`px-2 h-7 rounded-lg border text-[11px] font-bold font-sans cursor-pointer focus:outline-none appearance-none ${isLavender ? "tsumiki-btn-blue" : ""}`} style={{ WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "0.65em auto", paddingRight: "1.5rem", backgroundColor: isLavender ? undefined : "var(--bg-subtle)",
                borderColor: isLavender ? undefined : "var(--border-ui)",
                color: isLavender ? undefined : "var(--text-title)",
              }}
            >
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="90">90%</option>
              <option value="100">100% ({t('sidebar.zoom.default')})</option>
              <option value="110">110%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
              <option value="175">175%</option>
              <option value="200">200%</option>
            </select>
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
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90"
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
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] ui-dim flex items-center gap-1">
                    {currentUser.role === 'ADMIN' ? (
                      <span className="text-red-500 font-bold">Admin</span>
                    ) : currentUser.role === 'MODERATOR' ? (
                      <span className="text-emerald-500 font-bold">Mod</span>
                    ) : currentUser.supporterUntil && new Date(currentUser.supporterUntil) > new Date() ? (
                      <span className="text-emerald-500 font-bold">Supporter</span>
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 tsumiki-btn" style={{ backgroundColor: "var(--accent)" }}
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
    </>
  );
};








