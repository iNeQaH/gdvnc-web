/** HTTPS avatar URLs allowed for redirect/proxy (blocks open redirect). */
export function isSafeExternalAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'utfs.io' || host.endsWith('.ufs.sh')) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      const siteHost = new URL(site).hostname.toLowerCase();
      if (host === siteHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}
