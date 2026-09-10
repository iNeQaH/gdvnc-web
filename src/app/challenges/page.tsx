'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelsListPage from '../levels/page';

export default function ChallengesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/levels?tab=challenge');
  }, [router]);

  return <LevelsListPage listKind="challenge" />;
}
