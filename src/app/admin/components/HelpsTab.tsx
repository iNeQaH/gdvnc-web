'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, UserCheck, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { AdminListPager, UserAvatar } from './SharedUI';

export default function HelpsTab({
  onTotalChange,
}: {
  onTotalChange?: (n: number) => void;
}) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [verifyBusy, setVerifyBusy] = useState<string | null>(null);

  const verifyUser = async (userId: string, username: string) => {
    setVerifyBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || (t('admin.verify_fail') as any), 'error');
        return;
      }
      showToast(t('admin.verify_ok', { name: username, n: data.claimed || 0 }) as any, 'success');
      loadHelps(page); // refresh helps to show verified
    } catch (err) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setVerifyBusy(null);
    }
  };
  const [helps, setHelps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHelp, setSelectedHelp] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHelps = (p = 1) => {
    setLoading(true);
    fetch(`/api/admin/helps?page=${p}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.helps)) {
          setHelps(data.helps);
          setTotal(data.total || 0);
          setPage(data.page || p);
          onTotalChange?.(data.total || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadHelps(1);
  }, []);

  const decide = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !rejectReason.trim()) {
      showToast(t('admin.help_reject_need'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/helps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error === 'NEED_REASON' ? t('admin.help_reject_need') : (data.error || t('common.server_error')), 'error');
        return;
      }
      setSelectedHelp(null);
      setRejectReason('');
      loadHelps(page);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (helps.length === 0) return <div className="text-center ui-dim">Không có yêu cầu hỗ trợ nào.</div>;

  return (
    <div className="space-y-4">
      {helps.map((h) => (
        <div
          key={h.id}
          className="ui-card p-4 rounded-xl shadow-sm border flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => {
            setSelectedHelp(h);
            setRejectReason('');
          }}
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div className="flex items-center gap-3">
            <Link href={`/profile/${h.user?.username}`} onClick={(e) => e.stopPropagation()}>
              <UserAvatar
                url={h.user?.avatarUrl}
                name={h.user?.username}
                className="w-10 h-10 rounded-xl shrink-0"
              />
            </Link>
            <div>
              <Link href={`/profile/${h.user?.username}`} onClick={(e) => e.stopPropagation()} className="text-xs font-bold ui-dim hover:underline">
                {h.user?.gdUsername || h.user?.username || 'Unknown'}
              </Link>
              <h3 className="text-sm font-black truncate max-w-[200px] sm:max-w-md">{h.title}</h3>
            </div>
          </div>
          <div className="text-xs font-bold ui-dim">{new Date(h.createdAt).toLocaleDateString()}</div>
        </div>
      ))}

      {selectedHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedHelp(null)}>
          <div className="ui-card w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedHelp(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Link href={`/profile/${selectedHelp.user?.username}`}>
                  <UserAvatar
                    url={selectedHelp.user?.avatarUrl}
                    name={selectedHelp.user?.username}
                    className="w-20 h-20 rounded-2xl shadow-md"
                  />
                </Link>
                <Link href={`/profile/${selectedHelp.user?.username}`} className="text-sm font-black hover:underline">
                  {selectedHelp.user?.gdUsername || selectedHelp.user?.username}
                </Link>
                {selectedHelp.user?.id ? (
                  selectedHelp.user.gdVerified ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-emerald-600 bg-emerald-500/10">
                      <ShieldCheck className="w-3 h-3" /> {t('admin.verified')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => verifyUser(selectedHelp.user.id, selectedHelp.user.gdUsername || selectedHelp.user.username)}
                      disabled={verifyBusy === selectedHelp.user.id}
                      className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer disabled:opacity-50"
                      style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    >
                      <UserCheck className="w-3 h-3" /> {t('admin.verify_gd')}
                    </button>
                  )
                ) : null}
                <div className="text-[10px] font-bold ui-dim">{new Date(selectedHelp.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <h2 className="text-xl font-black ui-title">{selectedHelp.title}</h2>
                <div className="w-full h-48 overflow-y-auto p-4 rounded-xl border text-sm" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  {selectedHelp.content}
                </div>
                <input
                  placeholder={t('admin.review_note_ph')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(selectedHelp.id, 'REJECT')}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}
                  >
                    {t('admin.reject')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(selectedHelp.id, 'APPROVE')}
                    className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    {t('admin.approve')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AdminListPager page={page} total={total} onPage={loadHelps} t={t} />
    </div>
  );
}
