const fs = require('fs');
const path = require('path');

const content = import { Metadata } from 'next';
import prisma from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  
  const user = await prisma.user.findUnique({
    where: { username: decodedUsername }
  });

  if (!user) {
    return {
      title: 'Not Found | GDVNC',
      description: 'Player profile not found.',
    };
  }

  const title = \\ - GDVNC Player Profile\;
  const desc = \⭐ Classic: \ PP | 🎮 Plat: \ PP | 🛠️ CP: \\\n🌍 \\;

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
;

fs.writeFileSync('src/app/profile/[username]/layout.tsx', content);
