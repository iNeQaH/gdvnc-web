'use client';

import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { NotificationModal } from './NotificationModal';

export const TopUserBar = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadUserAndInbox = () => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);

        fetch(`/api/notifications`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setUnreadCount(data.unreadCount || 0);
            }
          })
          .catch(() => {});
      } catch (e) {
        localStorage.removeItem('gdvnc_user');
      }
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadUserAndInbox();
    window.addEventListener('gdvnc_user_update', loadUserAndInbox);
    return () => window.removeEventListener('gdvnc_user_update', loadUserAndInbox);
  }, []);

  if (!mounted || !currentUser) return null;

  return (
    <>
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 z-[60] flex items-center gap-2">
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
