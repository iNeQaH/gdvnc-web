import { clampImageScale, isNature, isTierId, type ChronicleEvent } from '@/lib/timeline/types';

type TimelineRow = {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  image: string | null;
  startAt: Date;
  endAt: Date;
  approximate: boolean;
  nature: string;
  tier: string;
  sourceKey?: string | null;
  glowColor?: string | null;
  imageScale?: number | null;
};

export function toChronicleEvent(row: TimelineRow): ChronicleEvent {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.shortDescription || '',
    fullDescription: row.fullDescription || '',
    image: row.image || '',
    start: row.startAt.getTime(),
    end: row.endAt.getTime(),
    approximate: row.approximate,
    nature: isNature(row.nature) ? row.nature : 'positive',
    tier: isTierId(row.tier) ? row.tier : '1y',
    sourceKey: row.sourceKey || null,
    glowColor: row.glowColor || null,
    imageScale: clampImageScale(row.imageScale),
  };
}
