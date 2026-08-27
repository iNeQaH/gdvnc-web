import prisma from '@/lib/prisma';

const IMAGE_ID_RE = /\/api\/images\/([A-Za-z0-9_-]+)/g;

export function imageIdsFromRef(ref: string | null | undefined): string[] {
  if (!ref) return [];
  return [...ref.matchAll(IMAGE_ID_RE)].map((m) => m[1]);
}

export async function storeDataUrlAsImage(dataUrl: string): Promise<string> {
  const image = await prisma.image.create({ data: { dataUrl } });
  return `/api/images/${image.id}`;
}

export async function purgeWorkImages(imageUrl: string | null | undefined) {
  const ids = imageIdsFromRef(imageUrl);
  if (ids.length > 0) {
    await prisma.image.deleteMany({ where: { id: { in: ids } } });
  }
}
