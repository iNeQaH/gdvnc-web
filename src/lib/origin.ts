export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

/** Page `fetch()` sends sec-fetch-site; same-origin GET may omit Origin. */
export function isBrowserSameOriginFetch(req: Request): boolean {
  const site = (req.headers.get('sec-fetch-site') || '').toLowerCase();
  if (site === 'same-origin') return true;
  return isSameOriginRequest(req);
}
