'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Bell, Check, Trash2, X, Sparkles, Gift, ShieldAlert, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnreadCount?: (count: number) => void;
}

export const NotificationModal = ({ userId, isOpen, onClose, onUpdateUnreadCount }: NotificationModalProps) => {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        if (onUpdateUnreadCount) {
          onUpdateUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  const markAsRead = async (notif: NotificationItem) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        const newUnread = notifications.filter((n) => !n.isRead && n.id !== notif.id).length;
        if (onUpdateUnreadCount) onUpdateUnreadCount(newUnread);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onUpdateUnreadCount) onUpdateUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (title: string) => {
    if (title.includes('Supporter')) {
      return <Sparkles className="w-4 h-4 text-pink-500" />;
    }
    if (title.includes('Tặng') || title.includes('SP')) {
      return <Gift className="w-4 h-4 text-amber-500" />;
    }
    if (title.includes('Phê Duyệt')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (title.includes('Từ Chối')) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Mail className="w-4 h-4 text-sky-500" />;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base ui-title leading-tight">
                {t('inbox.title')}
              </h2>
              <div className="text-[11px] ui-dim">
                {t('inbox.unread', { n: notifications.filter((n) => !n.isRead).length })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors hover:opacity-80 flex items-center gap-1"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                title={t('inbox.mark_all')}
              >
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="hidden sm:inline">{t('inbox.mark_all')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border hover:opacity-80 transition-colors"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Notification List */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[360px]">
          {loading ? (
            <div className="py-12 text-center text-xs ui-dim">{t('inbox.loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center opacity-40" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <Mail className="w-6 h-6 ui-dim" />
              </div>
              <div className="text-xs font-bold ui-title">{t('inbox.empty_title')}</div>
              <p className="text-[11px] ui-dim">{t('inbox.empty_desc')}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 hover:scale-[1.005] ${
                  notif.isRead ? 'opacity-70' : 'border-l-4'
                }`}
                style={{
                  backgroundColor: notif.isRead ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  borderColor: notif.isRead ? 'var(--border-subtle)' : 'var(--accent)',
                }}
              >
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  {getIcon(notif.title)}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs ${notif.isRead ? 'font-semibold' : 'font-extrabold'} ui-title truncate`}>
                      {notif.title}
                    </div>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-[11px] ui-dim line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="text-[10px] ui-dim flex items-center gap-1 pt-1 opacity-70">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detailed Modal Popup when clicked on a notification */}
        {selectedNotif && (
          <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
            <div
              className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-ui)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {getIcon(selectedNotif.title)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base ui-title">
                      {selectedNotif.title}
                    </h3>
                    <div className="text-[10px] ui-dim flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedNotif.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNotif(null)}
                  className="p-1.5 rounded-xl border hover:opacity-80 transition-colors"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl border text-xs leading-relaxed ui-title whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                {selectedNotif.message}
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
              >
                {t('inbox.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
