import prisma from '@/lib/prisma';
import {
  imageIdsFromRef,
  isUploadthingUrl,
  uploadDataUrlToUt,
} from '@/lib/uploadthing';

export type MediaMigrateLeftover = { kind: string; id?: string; error: string };

function needsMigrate(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if (text.startsWith('data:image/')) return true;
  if (text.includes('/api/images/')) return true;
  return false;
}

async function blobToUt(part: string, filename?: string): Promise<string> {
  const trimmed = part.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:image/')) {
    return uploadDataUrlToUt(trimmed, filename);
  }
  const imageId = imageIdsFromRef(trimmed)[0];
  if (!imageId) return trimmed;
  const row = await prisma.image.findUnique({ where: { id: imageId } });
  if (!row?.dataUrl) return trimmed;
  if (row.dataUrl.startsWith('http://') || row.dataUrl.startsWith('https://')) {
    return row.dataUrl;
  }
  if (!row.dataUrl.startsWith('data:image/')) return trimmed;
  const url = await uploadDataUrlToUt(row.dataUrl, filename || `${imageId}.jpg`);
  await prisma.image.update({ where: { id: imageId }, data: { dataUrl: url } }).catch(() => {});
  return url;
}

async function rewriteRef(ref: string | null | undefined, filename?: string): Promise<string | null> {
  if (ref == null) return null;
  const parts = String(ref)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const next: string[] = [];
  for (const [index, part] of parts.entries()) {
    if (!needsMigrate(part) || isUploadthingUrl(part)) {
      next.push(part);
      continue;
    }
    next.push(await blobToUt(part, filename ? `${filename}-${index}` : undefined));
  }
  return next.join(',') || null;
}

export async function migrateMediaToUt(batch = 20) {
  const leftover: MediaMigrateLeftover[] = [];
  let migrated = 0;
  let used = 0;
  const limit = Math.min(30, Math.max(1, batch));

  const images = await prisma.image.findMany({
    where: { dataUrl: { startsWith: 'data:' } },
    select: { id: true, dataUrl: true },
    take: limit,
  });

  for (const image of images) {
    used += 1;
    try {
      if (!image.dataUrl.startsWith('data:image/')) {
        leftover.push({ kind: 'image', id: image.id, error: 'not a data:image URL' });
        continue;
      }
      const url = await uploadDataUrlToUt(image.dataUrl, `${image.id}.jpg`);
      await prisma.image.update({ where: { id: image.id }, data: { dataUrl: url } });
      migrated += 1;
    } catch (error: any) {
      leftover.push({ kind: 'image', id: image.id, error: String(error?.message || error) });
    }
  }

  if (used < limit) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { avatarUrl: { startsWith: 'data:' } },
          { avatarUrl: { contains: '/api/images/' } },
          { coverUrl: { startsWith: 'data:' } },
          { coverUrl: { contains: '/api/images/' } },
        ],
      },
      select: { id: true, avatarUrl: true, coverUrl: true },
      take: limit - used,
    });

    for (const user of users) {
      used += 1;
      try {
        const avatarUrl = needsMigrate(user.avatarUrl)
          ? await rewriteRef(user.avatarUrl, `avatar-${user.id}`)
          : user.avatarUrl;
        const coverUrl = needsMigrate(user.coverUrl)
          ? await rewriteRef(user.coverUrl, `cover-${user.id}`)
          : user.coverUrl;
        if (avatarUrl !== user.avatarUrl || coverUrl !== user.coverUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { avatarUrl, coverUrl } });
          migrated += 1;
        }
      } catch (error: any) {
        leftover.push({ kind: 'user', id: user.id, error: String(error?.message || error) });
      }
    }
  }

  if (used < limit) {
    const works = await prisma.creatorWork.findMany({
      where: {
        OR: [{ imageUrl: { startsWith: 'data:' } }, { imageUrl: { contains: '/api/images/' } }],
      },
      select: { id: true, imageUrl: true },
      take: limit - used,
    });
    for (const work of works) {
      used += 1;
      try {
        const imageUrl = await rewriteRef(work.imageUrl, `work-${work.id}`);
        if (imageUrl !== work.imageUrl) {
          await prisma.creatorWork.update({ where: { id: work.id }, data: { imageUrl } });
          migrated += 1;
        }
      } catch (error: any) {
        leftover.push({ kind: 'work', id: work.id, error: String(error?.message || error) });
      }
    }
  }

  if (used < limit) {
    const events = await prisma.timelineEvent.findMany({
      where: {
        OR: [{ image: { startsWith: 'data:' } }, { image: { contains: '/api/images/' } }],
      },
      select: { id: true, image: true },
      take: limit - used,
    });
    for (const event of events) {
      used += 1;
      try {
        const image = await rewriteRef(event.image, `timeline-${event.id}`);
        if (image !== event.image) {
          await prisma.timelineEvent.update({ where: { id: event.id }, data: { image } });
          migrated += 1;
        }
      } catch (error: any) {
        leftover.push({ kind: 'timeline', id: event.id, error: String(error?.message || error) });
      }
    }
  }

  const [usersLeft, worksLeft, eventsLeft, imagesLeft] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [
          { avatarUrl: { startsWith: 'data:' } },
          { avatarUrl: { contains: '/api/images/' } },
          { coverUrl: { startsWith: 'data:' } },
          { coverUrl: { contains: '/api/images/' } },
        ],
      },
    }),
    prisma.creatorWork.count({
      where: {
        OR: [{ imageUrl: { startsWith: 'data:' } }, { imageUrl: { contains: '/api/images/' } }],
      },
    }),
    prisma.timelineEvent.count({
      where: {
        OR: [{ image: { startsWith: 'data:' } }, { image: { contains: '/api/images/' } }],
      },
    }),
    prisma.image.count({ where: { dataUrl: { startsWith: 'data:' } } }),
  ]);

  return {
    migrated,
    leftover,
    remaining: usersLeft + worksLeft + eventsLeft + imagesLeft,
    remainingUsers: usersLeft,
    remainingWorks: worksLeft,
    remainingEvents: eventsLeft,
    remainingImages: imagesLeft,
  };
}
