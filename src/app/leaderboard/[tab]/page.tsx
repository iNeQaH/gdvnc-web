'use client';

import { use } from 'react';
import LeaderboardView from '@/components/leaderboard/LeaderboardView';

const TAB_TO_MODE: Record<string, 'CLASSIC' | 'PLATFORMER' | 'CHALLENGE' | 'CREATOR' | 'STARS' | 'MOONS' | 'DEMONS' | 'ACTIVITY'> = {
  classic: 'CLASSIC',
  platformer: 'PLATFORMER',
  challenge: 'CHALLENGE',
  creator: 'CREATOR',
  stars: 'STARS',
  moons: 'MOONS',
  demons: 'DEMONS',
  activity: 'ACTIVITY',
};

export default function LeaderboardTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const resolvedParams = use(params);
  const tab = resolvedParams.tab.toLowerCase();
  const mode = TAB_TO_MODE[tab] || 'CLASSIC';

  return <LeaderboardView initialMode={mode} />;
}
