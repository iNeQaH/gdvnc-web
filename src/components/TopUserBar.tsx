'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Coins } from 'lucide-react';
import Link from 'next/link';
import { NotificationModal } from './NotificationModal';

export const TopUserBar = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [spBalance, setSpBalance] = useState(0);

  const loadUserAndBalance = () => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        setSpBalance(u.spPoints || 0);
        
        fetch(`/api/notifications?userId=${u.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setUnreadCount(data.unreadCount || 0);
            }
          })
          .catch(() => {});
          
        // Fetch fresh balance
        fetch('/api/support/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_BALANCE', userId: u.id }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
               setSpBalance(data.spPoints);
               const updatedUser = { ...u, spPoints: data.spPoints };
               localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
            }
          }).catch(() => {});
          
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadUserAndBalance();
    window.addEventListener('gdvnc_user_update', loadUserAndBalance);
    return () => window.removeEventListener('gdvnc_user_update', loadUserAndBalance);
  }, []);

  if (!mounted || !currentUser) return null;

  return (
    <>
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 z-[60] flex items-center gap-2">
        {/* SP Balance Widget */}
        <Link 
          href="/support"
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-sm border backdrop-blur-md transition-all hover:scale-105"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-ui)' 
          }}
          title="SP Points Balance"
        >
          <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-xs sm:text-sm font-black tracking-tight" style={{ color: 'var(--accent)' }}>
            {currentUser?.role === 'ADMIN' || currentUser?.username === 'iNeQaH' ? '∞' : spBalance.toLocaleString()} <span className="text-[10px] sm:text-xs font-bold text-amber-500">SP</span>
          </span>
        </Link>

        {/* Mailbox */}
        <button
          onClick={() => setIsInboxOpen(true)}
          className="p-2 sm:p-2.5 rounded-2xl shadow-sm border backdrop-blur-md transition-all hover:scale-105 relative cursor-pointer"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)'
          }}
          title="Inbox"
        >
          <Mail className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <NotificationModal
        userId={currentUser.id}
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        onUpdateUnreadCount={setUnreadCount}
      />
    </>
  );
};
