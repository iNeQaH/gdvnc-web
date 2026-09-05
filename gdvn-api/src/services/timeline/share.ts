export function eventSharePath(id: string) {
  return `/timeline/${encodeURIComponent(id)}`;
}

export function parseTimelineEventIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/timeline\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]).trim();
    return id || null;
  } catch {
    return null;
  }
}

export function stripChronicleText(html: string, max = 200) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function chronicleShareText(event: {
  title: string;
  shortDescription?: string;
  fullDescription?: string;
}) {
  return (
    String(event.shortDescription || '').trim() ||
    stripChronicleText(event.fullDescription || '', 180) ||
    event.title
  );
}
