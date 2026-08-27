import { getSiteBaseUrl } from '@/lib/profileEmbed';
import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';
import { victorCountForLevel } from '@/lib/levelLookup';

export async function getLevelEmbedData(level: {
  name: string;
  creatorName: string | null;
  gdLevelId: number;
  placement: number | null;
  difficultyFace: number;
  ratingType: string;
  mode: any;
  minPercent: number;
  basePp: number;
  records: any[];
}) {
  const victors = victorCountForLevel(level);
  const parts = [
    `Creator: ${level.creatorName || 'Unknown'}`,
    `GD ID: ${level.gdLevelId}`,
  ];
  if (level.placement != null) parts.push(`Top #${level.placement}`);
  parts.push(`Victors: ${victors}`);
  if (level.ratingType && level.ratingType !== 'NONE') parts.push(level.ratingType);

  const base = getSiteBaseUrl();
  const face = `${base}${getDifficultyFaceUrl(level.difficultyFace ?? 0)}`;
  const rating = getRatingIconUrl(level.ratingType);

  return {
    title: level.name,
    description: parts.join(' · '),
    url: `${base}/levels/${level.gdLevelId}`,
    image: `${base}/api/og/level/${level.gdLevelId}`,
    faceUrl: face,
    ratingUrl: rating ? `${base}${rating}` : null,
    victorCount: victors,
  };
}
