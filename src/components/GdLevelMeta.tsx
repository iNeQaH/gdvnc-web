'use client';

import React, { useEffect, useState } from 'react';
import { DifficultyRatingIcon } from '@/components/DifficultyRatingIcon';
import { DIFFICULTY_FACE_MAP } from '@/lib/gdDifficulty';

export type GdLevelMetaData = {
  name?: string | null;
  creatorName?: string | null;
  difficulty?: string | null;
  difficultyFace?: number | null;
  ratingType?: string | null;
  mode?: string | null;
  isVN?: boolean;
  isChallenge?: boolean;
  isPlatformer?: boolean;
  placement?: number | null;
  vnPlacement?: number | null;
};

function ratingLabel(ratingType?: string | null) {
  if (!ratingType || ratingType === 'NONE') return 'Unrated';
  if (ratingType === 'RATE') return 'Rated';
  return ratingType.charAt(0) + ratingType.slice(1).toLowerCase();
}

function difficultyLabel(data: GdLevelMetaData) {
  if (data.difficulty && String(data.difficulty).trim()) return String(data.difficulty);
  return DIFFICULTY_FACE_MAP[data.difficultyFace ?? 0] || 'NA';
}

export default function GdLevelMeta({
  gdLevelId,
  linked,
}: {
  gdLevelId?: number | string | null;
  linked?: GdLevelMetaData | null;
}) {
  const [fetched, setFetched] = useState<GdLevelMetaData | null>(null);

  useEffect(() => {
    const id = String(gdLevelId || '').trim();
    if (linked || !id || !/^\d+$/.test(id)) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/gd/level/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.level) setFetched(data.level);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gdLevelId, Boolean(linked)]);

  const meta = linked || fetched;

  if (!meta) {
    if (!gdLevelId) return null;
    return <div className="text-[11px] ui-dim">ID {gdLevelId}</div>;
  }

  const mode = meta.mode || (meta.isPlatformer ? 'PLATFORMER' : 'CLASSIC');

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] ui-dim">
      <DifficultyRatingIcon
        difficultyFace={meta.difficultyFace ?? 0}
        ratingType={meta.ratingType}
        className="w-7 h-7"
      />
      <span className="font-bold ui-title">
        {difficultyLabel(meta)} · {ratingLabel(meta.ratingType)}
      </span>
      {mode ? <span className="px-1.5 py-0.5 rounded ui-subtle font-bold">{mode}</span> : null}
      {meta.isVN ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20">
          VN{meta.vnPlacement ? ` #${meta.vnPlacement}` : ''}
        </span>
      ) : null}
      {meta.isChallenge ? (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/25">
          Challenge
        </span>
      ) : null}
      {meta.placement ? <span>#{meta.placement}</span> : null}
      {meta.creatorName ? <span>by {meta.creatorName}</span> : null}
    </div>
  );
}
