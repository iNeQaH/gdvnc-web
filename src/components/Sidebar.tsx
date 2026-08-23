'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Star, 
  Flame, 
  Send, 
  Dices, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  Heart, 
  Menu, 
  X,
  Globe,
  ZoomIn,
  Mail,
  Coins
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useLanguage } from './LanguageContext';
import { NotificationModal } from './NotificationModal';

export const Sidebar = () => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [spBalance, setSpBalance] = useState(0);

  const loadUserFromStorage = () => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        setSpBalance(u.spPoints || 0);
        fetch(`/api/notifications?userId=${u.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setUnreadCount(data.unreadCount || 0);
          })
          .catch(() => {});
        fetch('/api/support/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_BALANCE', userId: u.id }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setSpBalance(data.spPoints);
              localStorage.setItem('gdvnc_user', JSON.stringify({ ...u, spPoints: data.spPoints }));
            }
          })
          .catch(() => {});
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    } else {
      setCurrentUser(null);
      setUnreadCount(0);
      setSpBalance(0);
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    window.addEventListener('gdvnc_user_update', loadUserFromStorage);
    return () => window.removeEventListener('gdvnc_user_update', loadUserFromStorage);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('gdvnc_user');
    setCurrentUser(null);
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
    { href: '/', label: t('nav.leaderboard'), icon: Star },
    { href: '/levels', label: t('nav.demonlist'), icon: Flame },
    { href: '/submit', label: t('nav.submit'), icon: Send },
    { href: '/roulette', label: t('nav.roulette'), icon: Dices },
    { href: '/support', label: t('nav.supporter'), icon: Heart, highlight: false, isPink: true },
    { href: '/helps', label: 'Hỗ trợ / Helps', icon: Send},
    ...(currentUser?.role === 'ADMIN' ? [{ href: '/admin', label: t('nav.admin'), icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <header
        className="md:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 21 21 21 3 3 3"/><polygon points="3 21 21 21 3 21 3 21"/></svg>
          </div>
          <span className="font-black text-sm tracking-tight ui-title">
            GD<span style={{ color: 'var(--accent)' }}>VN</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {currentUser && (
            <>
              <Link
                href="/support"
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-black"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--accent)' }}
                title="SP Points"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {currentUser?.role === 'ADMIN' || currentUser?.username === 'iNeQaH' ? '∞' : spBalance.toLocaleString()}
              </Link>
              <button
                onClick={() => setIsInboxOpen(true)}
                className="p-2 rounded-xl border ui-dim hover:opacity-100 transition-colors relative"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                aria-label="Inbox"
              >
                <Mail className="w-4 h-4 ui-title" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </>
          )}
          <ThemeSwitcher />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl border ui-dim hover:opacity-100 transition-colors"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
            aria-label="Inbox"
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
          borderColor: 'var(--border-ui)',
        }}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 21 21 21 3 3 3"/><polygon points="3 21 21 21 3 21 3 21"/></svg>
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight ui-title leading-tight">
                  GD<span style={{ color: 'var(--accent)' }}>VN</span>
                </div>
                <div className="text-[10px] ui-dim font-medium">GDVNC</div>
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
          <nav className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider ui-dim">
              {t('nav.menu')}
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const actualBgCol = isActive ? 'var(--accent-bg)' : 'transparent';
              const actualTextCol = item.isPink ? '#f472b6' : (isActive ? 'var(--accent-text)' : 'var(--text-body)');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group"
                  style={{
                    backgroundColor: actualBgCol,
                    color: actualTextCol,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform ${item.isPink ? 'text-pink-400' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area, Language, Theme & Zoom Controls */}
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Language Selector Dropdown */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-medium ui-dim flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {t('sidebar.language')}
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 h-7 rounded-lg border text-[11px] font-bold font-sans cursor-pointer focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
            >
              <option value="en">{t('sidebar.lang.en')}</option>
              <option value="vi">{t('sidebar.lang.vi')}</option>
            </select>
          </div>

          {/* UI Zoom Dropdown */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-medium ui-dim flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" />
              {t('sidebar.zoom')}
            </span>
            <select
              value={uiScale}
              onChange={(e) => handleScaleChange(parseInt(e.target.value))}
              className="px-2 h-7 rounded-lg border text-[11px] font-bold font-sans cursor-pointer focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
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

          {/* Theme Row */}
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-medium ui-dim">{t('sidebar.theme')}</span>
            <ThemeSwitcher />
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 px-1">
              <Link
                href="/support"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black hover:opacity-90"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--accent)' }}
                title="SP Points"
              >
                <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
                {currentUser?.role === 'ADMIN' || currentUser?.username === 'iNeQaH' ? '∞' : spBalance.toLocaleString()} <span className="text-[10px] font-bold text-amber-500">SP</span>
              </Link>
              <button
                onClick={() => setIsInboxOpen(true)}
                className="p-2 rounded-xl border relative cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                title="Inbox"
              >
                <Mail className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* User Status Card */}
          {currentUser ? (
            <div className="p-2.5 mt-2 rounded-2xl border flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
              <Link
                href={`/profile/${currentUser.username}`}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90"
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs text-[color:var(--accent-fg)] font-bold shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
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
                    ) : currentUser.supporterUntil && new Date(currentUser.supporterUntil) > new Date() ? (
                      <span className="text-emerald-500 font-bold">Supporter</span>
                    ) : (
                      <span>{t('nav.profile')}</span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={handleLogout}
                  title={t('nav.logout')}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
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
          onUpdateUnreadCount={setUnreadCount}
        />
      )}
    </>
  );
};


