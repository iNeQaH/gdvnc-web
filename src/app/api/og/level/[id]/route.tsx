import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';
import { getSiteBaseUrl } from '@/lib/profileEmbed';

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
  const ratingSrc = getRatingIconUrl(level.ratingType);

  const iconSize = 360;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1120',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: iconSize,
            height: iconSize,
          }}
        >
          {ratingSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${base}${ratingSrc}`}
              width={iconSize}
              height={iconSize}
              style={{ position: 'absolute', left: 0, top: 0, objectFit: 'contain' }}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faceSrc}
            width={iconSize}
            height={iconSize}
            style={{ position: 'absolute', left: 0, top: 0, objectFit: 'contain' }}
          />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
