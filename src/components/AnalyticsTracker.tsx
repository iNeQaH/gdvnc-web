'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Ping analytics on route change
    if (pathname) {
      lastPathRef.current = pathname;
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {}); // Silent fail
    }
  }, [pathname]);

  // Periodic heartbeat to keep "online users" fresh while user has tab active
  useEffect(() => {
    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: lastPathRef.current || '/', heartbeat: true }),
        keepalive: true,
      }).catch(() => {});
    };

    // Heartbeat every 2 minutes (120,000 ms)
    const interval = setInterval(sendHeartbeat, 120_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
