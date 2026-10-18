'use client';

import React, { useState } from 'react';
import { sanitizeFaqHtml } from '@/lib/faqSanitize';

function InteractiveSpoiler({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((v) => !v);
      }}
      title={revealed ? 'Nhấp để ẩn spoiler' : 'Nhấp để xem spoiler'}
      className={`inline-block px-1.5 py-0.5 rounded transition-all cursor-pointer select-none font-medium text-xs ${
        revealed
          ? 'bg-zinc-700/60 text-zinc-100 hover:bg-zinc-700/80'
          : 'bg-zinc-800 dark:bg-zinc-900 text-transparent hover:brightness-125'
      }`}
    >
      {text}
    </span>
  );
}

function parseInlineTokens(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. Spoilers: ||...||
  // 2. Inline code: `...`
  // 3. Bold: **...**
  // 4. Underline: __...__
  // 5. Strikethrough: ~~...~~
  // 6. Italic: *...* or _..._
  // 7. Markdown links: [text](url)
  // 8. Plain URLs: https?://...
  const tokenRegex = /(?:\|\|([\s\S]+?)\|\||`([^`]+)`|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+))/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const [
      ,
      spoiler,
      code,
      bold,
      underline,
      strike,
      italicStar,
      italicUnder,
      linkText,
      linkUrl,
      rawUrl,
    ] = match;

    const key = `${keyPrefix}-${idx++}`;

    if (spoiler !== undefined) {
      nodes.push(<InteractiveSpoiler key={key} text={spoiler} />);
    } else if (code !== undefined) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono text-xs border border-white/10"
        >
          {code}
        </code>
      );
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key} className="font-extrabold text-[color:var(--text-title,#fff)]">
          {parseInlineTokens(bold, `${key}-b`)}
        </strong>
      );
    } else if (underline !== undefined) {
      nodes.push(
        <u key={key} className="underline underline-offset-2">
          {parseInlineTokens(underline, `${key}-u`)}
        </u>
      );
    } else if (strike !== undefined) {
      nodes.push(
        <del key={key} className="line-through opacity-70">
          {parseInlineTokens(strike, `${key}-s`)}
        </del>
      );
    } else if (italicStar !== undefined || italicUnder !== undefined) {
      const it = italicStar ?? italicUnder;
      nodes.push(
        <em key={key} className="italic opacity-90">
          {parseInlineTokens(it, `${key}-i`)}
        </em>
      );
    } else if (linkText !== undefined && linkUrl !== undefined) {
      nodes.push(
        <a
          key={key}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 hover:underline font-semibold break-all"
        >
          {linkText}
        </a>
      );
    } else if (rawUrl !== undefined) {
      nodes.push(
        <a
          key={key}
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 hover:underline font-semibold break-all"
        >
          {rawUrl}
        </a>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

export function parseDiscordMarkdown(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks: ```lang
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div
            key={`cb-${i}`}
            className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner font-mono text-xs"
          >
            {codeBlockLang && (
              <div className="px-3 py-1 bg-white/5 border-b border-white/10 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-amber-200 overflow-x-auto leading-relaxed">
              <code>{codeBlockLines.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
        continue;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check for Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-[color:var(--text-title,#fff)] mt-3 mb-1">
          {parseInlineTokens(line.slice(4), `h3-${i}`)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-black text-[color:var(--text-title,#fff)] mt-4 mb-1">
          {parseInlineTokens(line.slice(3), `h2-${i}`)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-black text-[color:var(--text-title,#fff)] mt-4 mb-1.5 border-b border-white/10 pb-1">
          {parseInlineTokens(line.slice(2), `h1-${i}`)}
        </h1>
      );
      continue;
    }

    // Check for Subtext (-# ...)
    if (line.startsWith('-# ')) {
      elements.push(
        <p key={`sub-${i}`} className="text-[11px] opacity-70 leading-normal my-0.5">
          {parseInlineTokens(line.slice(3), `sub-${i}`)}
        </p>
      );
      continue;
    }

    // Check for Blockquote (> ...)
    if (line.startsWith('> ') || line === '>') {
      const quoteText = line.startsWith('> ') ? line.slice(2) : '';
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-sky-500 pl-3 py-1 my-1 italic bg-sky-500/10 rounded-r-lg text-slate-200 text-sm"
        >
          {parseInlineTokens(quoteText, `quote-${i}`)}
        </blockquote>
      );
      continue;
    }

    // Check for Bullet list (- ... or * ...)
    if (/^[-*]\s+/.test(line)) {
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm leading-relaxed my-0.5">
          {parseInlineTokens(line.replace(/^[-*]\s+/, ''), `li-${i}`)}
        </li>
      );
      continue;
    }

    // Check for Numbered list (1. ...)
    if (/^\d+\.\s+/.test(line)) {
      elements.push(
        <li key={`oli-${i}`} className="ml-5 list-decimal text-sm leading-relaxed my-0.5">
          {parseInlineTokens(line.replace(/^\d+\.\s+/, ''), `oli-${i}`)}
        </li>
      );
      continue;
    }

    // Empty line / paragraph break
    if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-2.5" />);
      continue;
    }

    // Check if line looks like raw HTML/iframe
    if (line.includes('<iframe') || line.includes('<table') || line.includes('<div') || line.includes('<video')) {
      elements.push(
        <div
          key={`html-${i}`}
          className="my-2 max-w-full overflow-hidden rounded-xl [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:rounded-xl [&_iframe]:aspect-video"
          dangerouslySetInnerHTML={{ __html: sanitizeFaqHtml(line) }}
        />
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <p key={`p-${i}`} className="min-h-[1.25rem] leading-relaxed text-sm">
        {parseInlineTokens(line, `p-${i}`)}
      </p>
    );
  }

  // Handle unclosed code block if file ends inside one
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <div
        key="cb-unclosed"
        className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner font-mono text-xs"
      >
        <pre className="p-3 text-amber-200 overflow-x-auto leading-relaxed">
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      </div>
    );
  }

  return elements;
}

export default function DiscordMarkdown({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;
  return <div className={`discord-markdown space-y-1 ${className}`}>{parseDiscordMarkdown(content)}</div>;
}
