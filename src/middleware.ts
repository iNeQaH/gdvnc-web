import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function requestOriginFromUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function allowedSiteOrigins(siteUrl: string, host: string | null): Set<string> {
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(siteUrl).origin);
  } catch {
    /* ignore */
  }
  if (host) {
    try {
      allowed.add(new URL(`http://${host}`).origin);
      allowed.add(new URL(`https://${host}`).origin);
    } catch {
      /* ignore */
    }
  }
  return allowed;
}

function headerOriginAllowed(value: string, allowedOrigins: Set<string>): boolean {
  try {
    const parsed = new URL(value);
    return allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const method = request.method;

  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith('/api/cron/')) {
      return NextResponse.next();
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const secFetchSite = request.headers.get('sec-fetch-site');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8088';
    const host = request.headers.get('host');
    const allowedOrigins = allowedSiteOrigins(siteUrl, host);
    const requestOrigin = requestOriginFromUrl(request.url);

    let isAllowed = false;

    if (origin) {
      isAllowed = headerOriginAllowed(origin, allowedOrigins);
    } else if (referer) {
      isAllowed = headerOriginAllowed(referer, allowedOrigins);
    } else if (secFetchSite) {
      isAllowed = secFetchSite === 'same-origin' || secFetchSite === 'same-site';
    } else {
      const ua = request.headers.get('user-agent') || '';
      const isBrowser = ua.includes('Mozilla/') || ua.includes('Chrome/') || ua.includes('Safari');
      isAllowed = !isBrowser;
    }

    if (!isAllowed && requestOrigin && allowedOrigins.has(requestOrigin) && !origin && !referer) {
      isAllowed = secFetchSite !== 'cross-site';
    }

    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Chống tấn công CSRF: Yêu cầu bị từ chối do Nguồn không hợp lệ.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
