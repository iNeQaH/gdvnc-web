import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'discord.com',
  'open.spotify.com',
]);

let hooksReady = false;
function ensureHooks() {
  if (hooksReady) return;
  hooksReady = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;
    const src = (node as Element).getAttribute('src') || '';
    try {
      const host = new URL(src).hostname;
      if (!ALLOWED_IFRAME_HOSTS.has(host)) (node as Element).remove();
    } catch {
      (node as Element).remove();
    }
  });
}

export function sanitizeChronicleHtml(html: string): string {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
      'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'span', 'div', 'a', 'img',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math'],
  });
}

export function sanitizeFaqHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'pre', 'code',
      'iframe', 'video', 'source',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'id',
      'allow', 'allowfullscreen', 'frameborder', 'loading', 'controls', 'poster', 'type',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'svg'],
    ADD_TAGS: ['iframe'],
  });
}
