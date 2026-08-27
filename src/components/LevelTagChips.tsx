'use client';

import React from 'react';
import { levelTagFlags } from '@/lib/levelTags';
import { useLanguage } from '@/components/LanguageContext';

export default function LevelTagChips({
  level,
  alwaysChallenge = false,
  contrast = 'default',
}: {
  level: { isVN?: boolean | null; isChallenge?: boolean | null };
  alwaysChallenge?: boolean;
  contrast?: 'default' | 'onDark';
}) {
  const { t } = useLanguage();
  const tags = levelTagFlags(level);
  const showChallenge = alwaysChallenge || tags.isChallenge;

  const vnClass =
    contrast === 'onDark'
      ? 'px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-600/90 text-white border border-red-400/30'
      : 'px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20';
  const chClass =
    contrast === 'onDark'
      ? 'px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/90 text-black border border-amber-300/40'
      : 'px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25';

  if (!tags.isVN && !showChallenge) return null;

  return (
    <>
      {tags.isVN && <span className={`${vnClass} shrink-0`}>🇻🇳 VN</span>}
      {showChallenge && (
        <span className={`${chClass} shrink-0`}>{t('tags.challenge')}</span>
      )}
    </>
  );
}
