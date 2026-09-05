/** Lightweight HTML allowlist — no jsdom / DOMPurify (those break on Vercel serverless). */

const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'discord.com',
  'open.spotify.com',
]);

const VOID_TAGS = new Set(['br', 'img', 'hr', 'source']);

const URI_ATTRS = new Set(['href', 'src', 'poster']);

const CHRONICLE_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'span', 'div', 'a', 'img',
]);

const FAQ_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div', 'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'pre', 'code',
  'iframe', 'video', 'source',
]);

const CHRONICLE_ATTRS = new Set(['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class']);

const FAQ_ATTRS = new Set([
  'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'id',
  'allow', 'allowfullscreen', 'frameborder', 'loading', 'controls', 'poster', 'type',
]);

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function safeUrl(attr: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/[\s\\]/.test(value) || /[\u0000-\u001f]/.test(value)) return null;
  const lowered = value.toLowerCase();
  if (lowered.startsWith('javascript:') || lowered.startsWith('vbscript:') || lowered.startsWith('data:')) {
    return null;
  }
  if (attr === 'href') {
    if (value.startsWith('#') || value.startsWith('/') || /^(https?:|mailto:)/i.test(value)) return value;
    return null;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function iframeHostAllowed(src: string): boolean {
  try {
    return ALLOWED_IFRAME_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

function parseAttrs(raw: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const name = match[1].toLowerCase();
    if (!/^[a-z][a-z0-9:-]*$/.test(name) || name.startsWith('on') || name === 'srcdoc' || name === 'srcset' || name === 'style') {
      continue;
    }
    out.push([name, match[2] ?? match[3] ?? match[4] ?? '']);
  }
  return out;
}

function sanitizeHtml(html: string, allowedTags: Set<string>, allowedAttrs: Set<string>): string {
  if (!html) return '';
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9:-]*)([^>]*?)(\/?)>/g;
  let last = 0;
  let out = '';
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    out += html.slice(last, match.index);
    last = match.index + match[0].length;
    if (match[0].startsWith('<!--')) continue;
    const tag = match[1].toLowerCase();
    const isClose = match[0].startsWith('</');
    if (!allowedTags.has(tag)) continue;
    if (isClose) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
      continue;
    }
    const attrs = parseAttrs(match[2] || '');
    const kept: string[] = [];
    let srcValue = '';
    let hasBlankTarget = false;
    for (const [name, value] of attrs) {
      if (!allowedAttrs.has(name)) continue;
      if (URI_ATTRS.has(name)) {
        const url = safeUrl(name, value);
        if (!url) continue;
        if (name === 'src') srcValue = url;
        kept.push(`${name}="${escapeAttr(url)}"`);
        continue;
      }
      if (name === 'target') {
        if (value.toLowerCase() !== '_blank') continue;
        hasBlankTarget = true;
        kept.push('target="_blank"');
        continue;
      }
      if (name === 'allowfullscreen' || name === 'controls') {
        kept.push(name);
        continue;
      }
      if (name === 'id' || name === 'class') {
        if (/[<>"'`]/.test(value)) continue;
        kept.push(`${name}="${escapeAttr(value)}"`);
        continue;
      }
      kept.push(`${name}="${escapeAttr(value)}"`);
    }
    if (tag === 'iframe') {
      if (!srcValue || !iframeHostAllowed(srcValue)) continue;
    }
    if (hasBlankTarget && !kept.some((part) => part.startsWith('rel='))) {
      kept.push('rel="noopener noreferrer"');
    }
    const selfClose = VOID_TAGS.has(tag) || Boolean(match[3]);
    out += `<${tag}${kept.length ? ` ${kept.join(' ')}` : ''}${selfClose && VOID_TAGS.has(tag) ? ' />' : '>'}`;
  }
  out += html.slice(last);
  return out;
}

export function sanitizeChronicleHtml(html: string): string {
  return sanitizeHtml(html, CHRONICLE_TAGS, CHRONICLE_ATTRS);
}

export function sanitizeFaqHtml(html: string): string {
  return sanitizeHtml(html, FAQ_TAGS, FAQ_ATTRS);
}
