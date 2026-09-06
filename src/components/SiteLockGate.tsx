'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NationalDayLock from '@/components/NationalDayLock';
import { isSuperAdminUsername } from '@/lib/roles';

const LOCK_KEY = 'gdvnc_site_lock';
const LOCK_AT_KEY = 'gdvnc_site_lock_at';
const LOCK_TTL_MS = 60_000;

function readCachedLock(): boolean | null {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    const at = Number(sessionStorage.getItem(LOCK_AT_KEY) || 0);
    if (!raw || Date.now() - at > LOCK_TTL_MS) return null;
    return raw === '1';
  } catch {
    return null;
  }
}

function writeCachedLock(locked: boolean) {
  try {
    sessionStorage.setItem(LOCK_KEY, locked ? '1' : '0');
    sessionStorage.setItem(LOCK_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function SiteLockGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [canUnlock, setCanUnlock] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('gdvnc_user') || 'null');
      setCanUnlock(isSuperAdminUsername(user?.username));
    } catch {
      setCanUnlock(false);
    }

    const cached = readCachedLock();
    if (cached != null) {
      setLocked(cached);
      return;
    }

    fetch('/api/site-lock')
      .then((res) => res.json())
      .then((data) => {
        const on = Boolean(data?.locked);
        setLocked(on);
        writeCachedLock(on);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onUpdate = () => {
      const cached = readCachedLock();
      if (cached != null) setLocked(cached);
    };
    window.addEventListener('gdvnc_site_lock_update', onUpdate);
    return () => window.removeEventListener('gdvnc_site_lock_update', onUpdate);
  }, []);

  if (locked && pathname !== '/login') {
    return <NationalDayLock canUnlock={canUnlock} />;
  }

  return <>{children}</>;
}
