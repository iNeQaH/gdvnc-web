import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { getAuthUser, isFullAdminRole } from '@/lib/auth';

const f = createUploadthing();

export const gdvnFileRouter = {
  imageUploader: f({
    image: { maxFileSize: '16MB', maxFileCount: 4 },
  })
    .middleware(async () => {
      const user = await getAuthUser();
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, key: file.key };
    }),
  adminImage: f({
    image: { maxFileSize: '16MB', maxFileCount: 4 },
  })
    .middleware(async () => {
      const user = await getAuthUser();
      if (!user || !isFullAdminRole(user.role)) {
        throw new UploadThingError('Unauthorized');
      }
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type GdvnFileRouter = typeof gdvnFileRouter;
