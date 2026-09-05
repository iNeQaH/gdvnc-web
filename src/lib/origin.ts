export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

/**
 * Same-origin browser fetch. Missing Origin / sec-fetch-site is common on
 * iOS Safari and in-app browsers (Zalo, Facebook) — only reject when headers
 * are present and point at another site.
 */
export function isBrowserSameOriginFetch(req: Request): boolean {
  let requestOrigin = '';
  try {
    requestOrigin = new URL(req.url).origin;
  } catch {
    return false;
  }

  const site = (req.headers.get('sec-fetch-site') || '').toLowerCase();
  if (site === 'cross-site') return false;
  if (site === 'same-origin') return true;

  const origin = req.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  if (!site || site === 'same-site' || site === 'none') return true;
  return false;
}
