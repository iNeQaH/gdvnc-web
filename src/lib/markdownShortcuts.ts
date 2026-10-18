/**
 * Discord Markdown Keyboard Shortcuts & Auto-Formatting Utilities
 * Supports:
 * - Ctrl+B: Bold (**text**) with toggle
 * - Ctrl+I: Italic (*text*) with toggle
 * - Ctrl+U: Underline (__text__) with toggle
 * - Ctrl+Shift+X or Ctrl+Shift+S: Strikethrough (~~text~~) with toggle
 * - Ctrl+Shift+P or Ctrl+Alt+S: Spoiler (||text||) with toggle
 * - Ctrl+E or Ctrl+`: Inline code (`text`) with toggle
 * - Ctrl+Shift+C: Code block (```\ntext\n```)
 * - Ctrl+K: Markdown Link ([text](url))
 * - Auto-convert selected text + paste URL -> [selected text](pasted url)
 * - Smart Enter: auto-continue lists (- , 1. ) and blockquotes (> )
 */

import React from 'react';

export function isUrlString(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return false;
  return (
    /^https?:\/\/[^\s]+$/i.test(trimmed) ||
    /^(?:www\.)[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s]*$/i.test(trimmed)
  );
}

interface WrapOptions {
  prefix: string;
  suffix: string;
  defaultText?: string;
  canToggle?: boolean;
}

export function wrapTextareaSelection(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  options: WrapOptions
): { nextValue: string; selStart: number; selEnd: number } {
  const { prefix, suffix, defaultText = '', canToggle = true } = options;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const pLen = prefix.length;
  const sLen = suffix.length;

  // Case 1: Surrounding characters outside selection match prefix & suffix -> Unwrap
  if (
    canToggle &&
    start >= pLen &&
    end + sLen <= currentValue.length &&
    currentValue.substring(start - pLen, start) === prefix &&
    currentValue.substring(end, end + sLen) === suffix
  ) {
    const nextValue =
      currentValue.substring(0, start - pLen) +
      currentValue.substring(start, end) +
      currentValue.substring(end + sLen);
    return {
      nextValue,
      selStart: start - pLen,
      selEnd: end - pLen,
    };
  }

  // Case 2: Selected text itself starts and ends with prefix & suffix -> Unwrap
  const selected = currentValue.substring(start, end);
  if (
    canToggle &&
    selected.length >= pLen + sLen &&
    selected.startsWith(prefix) &&
    selected.endsWith(suffix)
  ) {
    const unwrapped = selected.substring(pLen, selected.length - sLen);
    const nextValue = currentValue.substring(0, start) + unwrapped + currentValue.substring(end);
    return {
      nextValue,
      selStart: start,
      selEnd: start + unwrapped.length,
    };
  }

  // Case 3: Wrap text (or insert placeholder if selection is empty)
  const innerText = selected || defaultText;
  const replacement = `${prefix}${innerText}${suffix}`;
  const nextValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);

  if (selected) {
    // Keep the inner text selected
    return {
      nextValue,
      selStart: start + pLen,
      selEnd: start + pLen + innerText.length,
    };
  } else {
    // Put cursor between prefix and suffix
    return {
      nextValue,
      selStart: start + pLen,
      selEnd: start + pLen,
    };
  }
}

/**
 * Handles pasting a URL over highlighted text: [selected text](pasted URL)
 */
export function handleMarkdownPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (val: string) => void
): boolean {
  const clip = e.clipboardData?.getData('text/plain') || '';
  if (!clip) return false;

  const trimmed = clip.trim();
  if (!isUrlString(trimmed)) return false;

  const textarea = e.currentTarget;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Only trigger when text is actually selected
  if (start === end) return false;

  e.preventDefault();

  const selectedText = value.substring(start, end);
  const targetUrl = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  const replacement = `[${selectedText}](${targetUrl})`;
  const nextValue = value.substring(0, start) + replacement + value.substring(end);
  const nextPos = start + replacement.length;

  setValue(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(nextPos, nextPos);
  });

  return true;
}

/**
 * Handles Discord Markdown keyboard shortcuts
 */
export function handleMarkdownKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (val: string) => void
): boolean {
  const isCtrl = e.ctrlKey || e.metaKey;
  const textarea = e.currentTarget;
  const key = e.key.toLowerCase();

  // Helper to commit wrapped selection
  const commitWrap = (prefix: string, suffix: string = prefix, defaultText = '') => {
    e.preventDefault();
    const result = wrapTextareaSelection(textarea, value, { prefix, suffix, defaultText });
    setValue(result.nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selStart, result.selEnd);
    });
  };

  // 1. Ctrl+B: Bold (**text**)
  if (isCtrl && !e.shiftKey && !e.altKey && key === 'b') {
    commitWrap('**');
    return true;
  }

  // 2. Ctrl+I: Italic (*text*)
  if (isCtrl && !e.shiftKey && !e.altKey && key === 'i') {
    commitWrap('*');
    return true;
  }

  // 3. Ctrl+U: Underline (__text__)
  if (isCtrl && !e.shiftKey && !e.altKey && key === 'u') {
    commitWrap('__');
    return true;
  }

  // 4. Ctrl+Shift+X or Ctrl+Shift+S: Strikethrough (~~text~~)
  if (isCtrl && e.shiftKey && (key === 'x' || key === 's')) {
    commitWrap('~~');
    return true;
  }

  // 5. Ctrl+Shift+P or Ctrl+Alt+S: Spoiler (||text||)
  if ((isCtrl && e.shiftKey && key === 'p') || (isCtrl && e.altKey && key === 's')) {
    commitWrap('||');
    return true;
  }

  // 6. Ctrl+E or Ctrl+`: Inline code (`text`)
  if (isCtrl && !e.shiftKey && (key === 'e' || e.key === '`')) {
    commitWrap('`');
    return true;
  }

  // 7. Ctrl+Shift+C: Code block (```lang\n...\n```)
  if (isCtrl && e.shiftKey && key === 'c') {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const replacement = `\`\`\`\n${selected || ''}\n\`\`\``;
    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    setValue(nextValue);
    const innerStart = start + 4;
    const innerEnd = innerStart + (selected ? selected.length : 0);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(innerStart, innerEnd);
    });
    return true;
  }

  // 8. Ctrl+K: Insert Link ([text](url))
  if (isCtrl && !e.shiftKey && !e.altKey && key === 'k') {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    if (selected) {
      const replacement = `[${selected}](url)`;
      const nextValue = value.substring(0, start) + replacement + value.substring(end);
      setValue(nextValue);
      // Select the "url" placeholder so user can immediately type or paste
      const urlStart = start + selected.length + 3;
      const urlEnd = urlStart + 3;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(urlStart, urlEnd);
      });
    } else {
      const replacement = `[](url)`;
      const nextValue = value.substring(0, start) + replacement + value.substring(end);
      setValue(nextValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      });
    }
    return true;
  }

  // 9. Enter key: Auto-continue lists (- , 1. ) and blockquotes (> )
  if (!isCtrl && !e.shiftKey && !e.altKey && e.key === 'Enter') {
    const start = textarea.selectionStart;
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const currentLine = beforeCursor.substring(lineStart);

    // Unordered list: "- " or "* "
    const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
    if (bulletMatch) {
      const [, indent, bullet, rest] = bulletMatch;
      e.preventDefault();
      if (!rest.trim()) {
        // Line was empty list item -> Clear bullet on this line
        const nextValue = value.substring(0, lineStart) + value.substring(start);
        setValue(nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        });
      } else {
        // Insert new list item
        const continuation = `\n${indent}${bullet} `;
        const nextValue = value.substring(0, start) + continuation + value.substring(start);
        setValue(nextValue);
        const nextPos = start + continuation.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(nextPos, nextPos);
        });
      }
      return true;
    }

    // Numbered list: "1. "
    const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const [, indent, numStr, rest] = numMatch;
      e.preventDefault();
      if (!rest.trim()) {
        // Empty item -> Clear item prefix
        const nextValue = value.substring(0, lineStart) + value.substring(start);
        setValue(nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        });
      } else {
        const nextNum = parseInt(numStr, 10) + 1;
        const continuation = `\n${indent}${nextNum}. `;
        const nextValue = value.substring(0, start) + continuation + value.substring(start);
        setValue(nextValue);
        const nextPos = start + continuation.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(nextPos, nextPos);
        });
      }
      return true;
    }

    // Blockquote: "> "
    const quoteMatch = currentLine.match(/^(\s*>\s*)(.*)$/);
    if (quoteMatch) {
      const [, prefix, rest] = quoteMatch;
      e.preventDefault();
      if (!rest.trim()) {
        // Empty quote line -> End blockquote
        const nextValue = value.substring(0, lineStart) + value.substring(start);
        setValue(nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        });
      } else {
        const continuation = `\n${prefix}`;
        const nextValue = value.substring(0, start) + continuation + value.substring(start);
        setValue(nextValue);
        const nextPos = start + continuation.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(nextPos, nextPos);
        });
      }
      return true;
    }
  }

  return false;
}
