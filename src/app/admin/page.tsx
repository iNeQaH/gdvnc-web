'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Shield, LifeBuoy, Users, Wrench, Activity } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { isSuperAdminUsername } from '@/lib/roles';
import { refreshSessionUser } from '@/lib/sessionClient';

import RecordsTab from './components/RecordsTab';
import WorksTab from './components/WorksTab';
import UsersTab from './components/UsersTab';
import LevelsTab from './components/LevelsTab';
import HelpsTab from './components/HelpsTab';

export default function AdminPage() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tab, setTabState] = useState<'records' | 'works' | 'users' | 'levels' | 'helps'>('records');

  // We maintain simple totals for the tab badges, populated by the tabs.
  const [recordCount, setRecordCount] = useState(0);
  const [workCount, setWorkCount] = useState(0);
  const [helpsTotal, setHelpsTotal] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('adminTab');
    if (saved === 'files' || saved === 'badges') {
      setTabState('levels');
      localStorage.setItem('adminTab', 'levels');
    } else if (saved === 'levelSubs') {
      setTabState('works');
      localStorage.setItem('adminTab', 'works');
    } else if (saved) setTabState(saved as any);
  }, []);

  useEffect(() => {
    if (currentUser && tab === 'levels' && !isSuperAdminUsername(currentUser.username)) {
      setTabState('records');
      localStorage.setItem('adminTab', 'records');
    }
  }, [currentUser, tab]);

  const setTab = (t: any) => {
    setTabState(t);
    localStorage.setItem('adminTab', t);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
      } catch (e) {}
    }
    void refreshSessionUser().then((u) => {
      if (u) setCurrentUser(u);
    });

    // Fetch initial counts for the badges if needed (optional)
    fetch('/api/admin/helps?page=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHelpsTotal(data.total || 0);
      })
      .catch(() => {});
  }, []);

  if (!currentUser) return <div className="p-10 text-center font-bold">Đang tải / Loading...</div>;

  const isSuperAdmin = isSuperAdminUsername(currentUser.username);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="ui-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase ui-dim flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            {t('admin.system')}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold ui-title">
            {t('admin.dashboard')}
          </h1>
          <div className="text-xs ui-dim">
            {t('admin.account', { name: currentUser.username, role: isSuperAdmin ? 'Super Admin' : currentUser.role })}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl border shrink-0" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
          <button
            onClick={() => setTab('records')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'records' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'records' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            Records {recordCount > 0 && `(${recordCount})`}
          </button>
          <button
            onClick={() => setTab('works')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'works' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'works' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            {t('admin.tab_creator')} {workCount > 0 && `(${workCount})`}
          </button>
          <button
            onClick={() => setTab('helps')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'helps' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'helps' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            Helps {helpsTotal > 0 && `(${helpsTotal})`}
          </button>
          <button
            onClick={() => setTab('users')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: tab === 'users' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'users' ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            Members
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setTab('levels')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: tab === 'levels' ? 'var(--bg-card)' : 'transparent',
                color: tab === 'levels' ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              <Wrench className="w-3.5 h-3.5" />
              {t('admin.tab_levels')}
            </button>
          )}
          {isSuperAdmin && (
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--text-dim)' }}
            >
              <Activity className="w-3.5 h-3.5" />
              Analytics
            </Link>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {tab === 'records' && <RecordsTab currentUser={currentUser} />}
        {tab === 'works' && <WorksTab currentUser={currentUser} />}
        {tab === 'users' && <UsersTab currentUser={currentUser} />}
        {tab === 'levels' && isSuperAdmin && <LevelsTab currentUser={currentUser} isSuperAdmin={isSuperAdmin} />}
        {tab === 'helps' && <HelpsTab onTotalChange={setHelpsTotal} />}
      </div>
    </div>
  );
}
