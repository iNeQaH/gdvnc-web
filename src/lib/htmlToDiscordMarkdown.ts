/**
 * Utility to convert raw HTML / rich-text markup into Discord Markdown
 * Supports headings, bold, italic, underline, strikethrough, blockquotes,
 * links, code blocks, lists, spoilers, and line breaks.
 */

export function htmlToDiscordMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Unescape common HTML entities before or during processing
  md = md.replace(/&nbsp;/gi, ' ');
  md = md.replace(/&amp;/gi, '&');
  md = md.replace(/&lt;/gi, '<');
  md = md.replace(/&gt;/gi, '>');
  md = md.replace(/&quot;/gi, '"');
  md = md.replace(/&#39;/gi, "'");

  // Code blocks: <pre><code(?: class="language-(.*?)")?>([\s\S]*?)</code></pre>
  md = md.replace(/<pre><code(?:\s+class=["'](?:language-)?([a-z0-9_-]+)["'])?>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
    return `\n\`\`\`${lang || ''}\n${code.trim()}\n\`\`\`\n`;
  });
  md = md.replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return `\n\`\`\`\n${code.trim()}\n\`\`\`\n`;
  });

  // Inline code: <code>...</code>
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Spoilers: <span class="spoiler">...</span> or <spoiler>...</spoiler>
  md = md.replace(/<span\s+class=["'][^"']*spoiler[^"']*["']>([\s\S]*?)<\/span>/gi, '||$1||');
  md = md.replace(/<spoiler>([\s\S]*?)<\/spoiler>/gi, '||$1||');

  // Headings: <h1> to <h6>
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n### $1\n\n');

  // Bold: <b> and <strong>
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');

  // Underline: <u> and <ins>
  md = md.replace(/<(?:u|ins)[^>]*>([\s\S]*?)<\/(?:u|ins)>/gi, '__$1__');

  // Strikethrough: <s>, <strike>, <del>
  md = md.replace(/<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi, '~~$1~~');

  // Italic: <i> and <em>
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // Links: <a href="url">text</a>
  md = md.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Blockquotes: <blockquote>...</blockquote>
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
    const lines = text.trim().split(/\r?\n/);
    const quoted = lines.map((l: string) => `> ${l.replace(/^>\s*/, '')}`).join('\n');
    return `\n${quoted}\n`;
  });

  // Unordered list items: <li> inside <ul>
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, list) => {
    const items = list.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    return `\n${items}\n`;
  });

  // Ordered list items: <li> inside <ol>
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, list) => {
    let index = 1;
    const items = list.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${index++}. $1\n`);
    return `\n${items}\n`;
  });

  // Standalone list items (if not inside ul/ol)
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Paragraphs and breaks: <p>, <br>, <div>, <hr>
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // Strip remaining HTML tags (like <span>, <section>, etc.) except iframes which we preserve
  md = md.replace(/<(?!iframe|\/iframe)(?:[^>]+)>/gi, '');

  // Normalize multiple consecutive newlines (max 2)
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}
