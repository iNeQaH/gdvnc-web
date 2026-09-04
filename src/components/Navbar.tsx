'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Folder, Goal, ClipboardList, ShieldCheck, User as UserIcon, LogOut } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useLanguage } from './LanguageContext';
import BrandMark from '@/components/BrandMark';
import { isStaffRole } from '@/lib/roles';

export const Navbar = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('gdvnc_user');
    setCurrentUser(null);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: t('nav.leaderboard'), icon: Trophy },
    { href: '/levels', label: t('nav.demonlist'), icon: Folder },
    { href: '/challenges', label: t('nav.challenges'), icon: Goal },
    { href: '/submit', label: t('nav.submit'), icon: ClipboardList },
    ...(isStaffRole(currentUser?.role) ? [{ href: '/admin', label: t('nav.admin'), icon: ShieldCheck }] : []),
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-ui)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <BrandMark size={32} className="rounded-lg" />
          <div>
            <span className="font-extrabold text-base tracking-tight ui-title">
              GDVN
            </span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-body)',
                }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side tools */}
        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${currentUser.username}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-[color:var(--accent-fg)] font-bold" style={{ backgroundColor: 'var(--accent)' }}>
                  {currentUser.username[0]}
                </div>
                <span>{currentUser.username}</span>
                {currentUser.role === 'ADMIN' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                    Admin
                  </span>
                )}
                {currentUser.role === 'MODERATOR' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                    Mod
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <UserIcon className="w-3.5 h-3.5" />
              {t('auth.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

