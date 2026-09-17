import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';
import { getSiteBaseUrl } from '@/lib/profileEmbed';
import { renderLevelOgImage } from '@/lib/siteOg';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gdLevelId = Number(id);
  if (!Number.isFinite(gdLevelId)) {
    return new Response('Not found', { status: 404 });
  }

  const level = await prisma.level.findUnique({
    where: { gdLevelId },
    select: { name: true, difficultyFace: true, ratingType: true },
  });
  if (!level) return new Response('Not found', { status: 404 });

  const base = getSiteBaseUrl();
  const faceSrc = `${base}${getDifficultyFaceUrl(level.difficultyFace ?? 0)}`;
  const ratingPath = getRatingIconUrl(level.ratingType);
  const ratingSrc = ratingPath ? `${base}${ratingPath}` : null;

  return renderLevelOgImage(level.name, faceSrc, ratingSrc);
}
