'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Ping analytics in the background
    if (pathname && !pathname.startsWith('/admin')) {
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: pathname }),
        // Keepalive to ensure it fires even if navigating away
        keepalive: true,
      }).catch(() => {}); // Silent fail
    }
  }, [pathname]);

  return null;
}
