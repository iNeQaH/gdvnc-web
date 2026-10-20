'use client';

import { use } from 'react';
import HomePage from '@/app/page';

const TAB_TO_MODE: Record<string, 'CLASSIC' | 'PLATFORMER' | 'CHALLENGE' | 'CREATOR' | 'STARS' | 'MOONS' | 'DEMONS'> = {
  classic: 'CLASSIC',
  platformer: 'PLATFORMER',
  challenge: 'CHALLENGE',
  creator: 'CREATOR',
  stars: 'STARS',
  moons: 'MOONS',
  demons: 'DEMONS',
};

export default function LeaderboardTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const resolvedParams = use(params);
  const tab = resolvedParams.tab.toLowerCase();
  const mode = TAB_TO_MODE[tab] || 'CLASSIC';

  return <HomePage initialMode={mode} />;
}
