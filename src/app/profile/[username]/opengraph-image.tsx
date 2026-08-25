import { ImageResponse } from 'next/og';
import { Role } from '@prisma/client';
import { getProfileEmbedData, loadOgCompatibleImage } from '@/lib/profileEmbed';

export const runtime = 'nodejs';
export const alt = 'GDVNC Player Profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

const ROLE_MARKS: Partial<Record<Role, { label: string; bg: string; fg: string }>> = {
  ADMIN: { label: '♛', bg: '#fecaca', fg: '#b91c1c' },
  MODERATOR: { label: '⛨', bg: '#bbf7d0', fg: '#15803d' },
};

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getProfileEmbedData(username);

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#fff',
            fontSize: 42,
            fontWeight: 700,
          }}
        >
          Profile not found
        </div>
      ),
      { ...size }
    );
  }

  const [coverSrc, avatarSrc] = await Promise.all([
    loadOgCompatibleImage(data.coverUrl, 'cover'),
    loadOgCompatibleImage(data.avatarUrl, 'avatar'),
  ]);

  const isSupporter = Boolean(data.supporterUntil && new Date(data.supporterUntil) > new Date());

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0b1220',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 280,
            position: 'relative',
            background: coverSrc
              ? '#0f172a'
              : 'linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #312e81 100%)',
          }}
        >
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              width={1200}
              height={280}
              style={{ width: 1200, height: 280, objectFit: 'cover' }}
            />
          ) : null}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1200,
              height: 280,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(11,18,32,0.88))',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 56,
            top: 190,
            width: 148,
            height: 148,
            borderRadius: 28,
            border: '6px solid #0b1220',
            overflow: 'hidden',
            background: '#1e293b',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              width={148}
              height={148}
              style={{ width: 148, height: 148, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 148,
                height: 148,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                fontWeight: 800,
                color: '#64748b',
              }}
            >
              {data.username[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '24px 56px 40px 230px',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, letterSpacing: -1 }}>
              {data.username}
            </div>

            {data.showBadgeRow ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {data.role !== Role.USER && ROLE_MARKS[data.role] ? (
                  <div
                    style={{
                      display: 'flex',
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: ROLE_MARKS[data.role]!.bg,
                      color: ROLE_MARKS[data.role]!.fg,
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {ROLE_MARKS[data.role]!.label}
                  </div>
                ) : null}
                {isSupporter ? (
                  <div
                    style={{
                      display: 'flex',
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fce7f3',
                      color: '#db2777',
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    ♥
                  </div>
                ) : null}
                {data.badges.slice(0, 8).map((badge, i) => (
                  <div
                    key={`badge-${i}`}
                    style={{
                      display: 'flex',
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: badge.color,
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    ★
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {data.pointLines.map((line) => (
              <div key={line} style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
                {line}
              </div>
            ))}
            {data.hardestLines.map((line) => (
              <div key={line} style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: '#94a3b8' }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: 40,
            bottom: 28,
            fontSize: 22,
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: 2,
          }}
        >
          GDVNC
        </div>
      </div>
    ),
    { ...size }
  );
}
