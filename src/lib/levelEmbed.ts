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
  const line1 = `Creator: ${level.creatorName || 'Unknown'} · ID: ${level.gdLevelId}`;
  const line2Parts: string[] = [];
  if (level.placement != null) line2Parts.push(`Top #${level.placement}`);
  line2Parts.push(`Victors: ${victors}`);
  if (level.ratingType && level.ratingType !== 'NONE') line2Parts.push(level.ratingType);

  const description = line2Parts.length > 0 ? `${line1}\n${line2Parts.join(' · ')}` : line1;

  const base = getSiteBaseUrl();
  const face = `${base}${getDifficultyFaceUrl(level.difficultyFace ?? 0)}`;
  const rating = getRatingIconUrl(level.ratingType);

  return {
    title: level.name,
    description,
    url: `${base}/levels/${level.gdLevelId}`,
    image: `${base}/api/og/level/${level.gdLevelId}`,
    faceUrl: face,
    ratingUrl: rating ? `${base}${rating}` : null,
    victorCount: victors,
  };
}
