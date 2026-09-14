import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const method = request.method;

  // Only protect mutating HTTP methods
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    const pathname = request.nextUrl.pathname;

    // Exempt cron jobs (they use Bearer CRON_SECRET authorization)
    if (pathname.startsWith('/api/cron/')) {
      return NextResponse.next();
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const secFetchSite = request.headers.get('sec-fetch-site');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8088';
    const host = request.headers.get('host');

    let isAllowed = false;

    if (origin) {
      isAllowed = origin.startsWith(siteUrl) || (!!host && origin.includes(host));
    } else if (referer) {
      isAllowed = referer.startsWith(siteUrl) || (!!host && referer.includes(host));
    } else if (secFetchSite) {
      isAllowed = secFetchSite === 'same-origin' || secFetchSite === 'same-site';
    } else {
      // If none of origin, referer, or sec-fetch-site are present, check user-agent.
      const ua = request.headers.get('user-agent') || '';
      const isBrowser = ua.includes('Mozilla/') || ua.includes('Chrome/') || ua.includes('Safari/');
      // Reject browser requests missing all origin/referer headers for mutating endpoints
      isAllowed = !isBrowser;
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
