import prisma from '@/lib/prisma';
import {
  deleteStoredImages,
  imageIdsFromRef,
  uploadDataUrlToUt,
} from '@/lib/uploadthing';

export { imageIdsFromRef };

export async function storeDataUrlAsImage(dataUrl: string): Promise<string> {
  return uploadDataUrlToUt(dataUrl);
}

export async function purgeWorkImages(imageUrl: string | null | undefined) {
  await deleteStoredImages(imageUrl);
  const ids = imageIdsFromRef(imageUrl);
  if (ids.length > 0) {
    await prisma.image.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  }
}
