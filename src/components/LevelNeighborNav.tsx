'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from './LanguageContext';

import { levelPath } from '@/lib/levelUrl';

interface NeighborLevel {
  id: string;
  gdLevelId: number;
  name: string;
  placement: number | null;
}

interface LevelNeighborNavProps {
  currentPlacement: number | null;
  prevLevel?: NeighborLevel | null;
  nextLevel?: NeighborLevel | null;
  firstLevel?: NeighborLevel | null;
  lastLevel?: NeighborLevel | null;
}

export default function LevelNeighborNav({
  currentPlacement,
  prevLevel,
  nextLevel,
  firstLevel,
  lastLevel,
}: LevelNeighborNavProps) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border backdrop-blur-md"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
    >
      {firstLevel ? (
        <Link
          href={levelPath(firstLevel)}
          className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          title={`#${firstLevel.placement} ${firstLevel.name}`}
        >
          <ChevronsLeft className="w-4 h-4 ui-title" />
        </Link>
      ) : (
        <span className="p-2 rounded-xl opacity-30 pointer-events-none">
          <ChevronsLeft className="w-4 h-4 ui-title" />
        </span>
      )}

      {prevLevel ? (
        <Link
          href={levelPath(prevLevel)}
          className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          title={`#${prevLevel.placement} ${prevLevel.name}`}
        >
          <ChevronLeft className="w-4 h-4 ui-title" />
        </Link>
      ) : (
        <span className="p-2 rounded-xl opacity-30 pointer-events-none">
          <ChevronLeft className="w-4 h-4 ui-title" />
        </span>
      )}

      <div className="flex items-center gap-1 px-2 min-w-[3rem] justify-center">
        <span className="text-xs font-black ui-title">
          {currentPlacement != null ? `#${currentPlacement}` : '—'}
        </span>
      </div>

      {nextLevel ? (
        <Link
          href={levelPath(nextLevel)}
          className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          title={`#${nextLevel.placement} ${nextLevel.name}`}
        >
          <ChevronRight className="w-4 h-4 ui-title" />
        </Link>
      ) : (
        <span className="p-2 rounded-xl opacity-30 pointer-events-none">
          <ChevronRight className="w-4 h-4 ui-title" />
        </span>
      )}

      {lastLevel ? (
        <Link
          href={levelPath(lastLevel)}
          className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          title={`#${lastLevel.placement} ${lastLevel.name}`}
        >
          <ChevronsRight className="w-4 h-4 ui-title" />
        </Link>
      ) : (
        <span className="p-2 rounded-xl opacity-30 pointer-events-none">
          <ChevronsRight className="w-4 h-4 ui-title" />
        </span>
      )}
    </div>
  );
}
