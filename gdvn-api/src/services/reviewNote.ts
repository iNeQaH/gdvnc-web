import { clipText } from './validate';

export function clipReviewNote(raw: unknown, max = 2000): string {
  if (typeof raw !== 'string') return '';
  return clipText(raw.trim(), max);
}

export function notifyWithNote(base: string, note: string): string {
  return note ? `${base}\n${note}` : base;
}

