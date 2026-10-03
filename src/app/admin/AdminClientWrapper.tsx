'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Shield, LifeBuoy, Users, Wrench, Activity, Table } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { isSuperAdminUser } from '@/lib/roles';

interface AdminContextType {
  setRecordCount: (count: number) => void;
  setWorkCount: (count: number) => void;
  setHelpsTotal: (count: number) => void;
  currentUser: any;
  isSuperAdmin: boolean;
}

export const AdminContext = createContext<AdminContextType>({
  setRecordCount: () => {},
  setWorkCount: () => {},
  setHelpsTotal: () => {},
  currentUser: null,
  isSuperAdmin: false,
});

export const useAdminContext = () => useContext(AdminContext);

export default function AdminClientWrapper({ children, initialUser }: { children: React.ReactNode; initialUser: any }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(initialUser);

  // Tab badges
  const [recordCount, setRecordCount] = useState(0);
  const [workCount, setWorkCount] = useState(0);
  const [helpsTotal, setHelpsTotal] = useState(0);

  useEffect(() => {
    // Client-side sync if localStorage differs
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }

    // Fetch initial counts for all tab badges in parallel
    Promise.allSettled([
      fetch('/api/admin/helps?page=1').then((r) => r.json()),
      fetch('/api/admin/records/pending?page=1').then((r) => r.json()),
      fetch('/api/admin/works?page=1').then((r) => r.json()),
    ]).then(([helpsRes, recordsRes, worksRes]) => {
      if (helpsRes.status === 'fulfilled' && helpsRes.value?.success) {
        setHelpsTotal(helpsRes.value.total || 0);
      }
      if (recordsRes.status === 'fulfilled' && recordsRes.value?.counts?.pending !== undefined) {
        setRecordCount(recordsRes.value.counts.pending || 0);
      }
      if (worksRes.status === 'fulfilled' && worksRes.value?.counts?.pending !== undefined) {
        setWorkCount(worksRes.value.counts.pending || 0);
      }
    });
  }, []);

  if (!currentUser) return <div className="p-10 text-center font-bold">Đang tải / Loading...</div>;

  const isSuperAdmin = isSuperAdminUser(currentUser);

  // Nav item helper
  const NavLink = ({ href, icon: Icon, label, count, exact = false }: any) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
        style={{
          backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-dim)',
        }}
      >
        <Icon className="w-3.5 h-3.5" />
        {label} {count > 0 && `(${count})`}
      </Link>
    );
  };

  return (
    <AdminContext.Provider value={{ setRecordCount, setWorkCount, setHelpsTotal, currentUser, isSuperAdmin }}>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="ui-card p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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

          {/* Navigation Toggle */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl border shrink-0" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
            <NavLink href="/admin/records" icon={Shield} label="Records" count={recordCount} />
            <NavLink href="/admin/creator" icon={Shield} label={t('admin.tab_creator')} count={workCount} />
            <NavLink href="/admin/helps" icon={LifeBuoy} label="Helps" count={helpsTotal} />
            <NavLink href="/admin/members" icon={Users} label="Members" />
            <NavLink href="/admin/levels" icon={Table} label="Level Grid" exact />
            {isSuperAdmin && (
              <NavLink href="/admin/functions" icon={Wrench} label={t('admin.tab_levels')} />
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

        {/* Route Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
