import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { RecordStatus, LevelMode } from '@prisma/client';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  
  const user = await prisma.user.findUnique({
    where: { username: decodedUsername },
    include: {
      records: {
        where: { status: RecordStatus.APPROVED },
        include: { level: true }
      }
    }
  });

  if (!user) {
    return {
      title: 'Not Found | GDVNC',
      description: 'Player profile not found.',
    };
  }

  const classicRecords = user.records.filter(r => r.level.mode === LevelMode.CLASSIC);
  const platRecords = user.records.filter(r => r.level.mode === LevelMode.PLATFORMER);

  const hardestClassic = classicRecords
    .filter(r => r.level.placement !== null)
    .sort((a, b) => a.level.placement! - b.level.placement!)[0];

  const hardestPlat = platRecords
    .filter(r => r.level.placement !== null)
    .sort((a, b) => a.level.placement! - b.level.placement!)[0];

  const title = `${user.username} - GDVNC Player Profile`;
  
  let descLines = [];
  descLines.push(`Classic Pt: ${Math.floor(user.classicPp)} | Platformer Pt: ${Math.floor(user.platformerPp)} | Creator Pt: ${user.creatorPoints}`);
  
  if (hardestClassic) {
    descLines.push(`Classic Hardest: ${hardestClassic.level.name}`);
  }
  if (hardestPlat) {
    descLines.push(`Platformer Hardest: ${hardestPlat.level.name}`);
  }

  const desc = descLines.join('\n');

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      images: user.avatarUrl ? [user.avatarUrl] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description: desc,
      images: user.avatarUrl ? [user.avatarUrl] : [],
    }
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
