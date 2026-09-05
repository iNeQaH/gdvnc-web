import { PrismaClient } from '@prisma/client';
import { applyPendingSchema } from '@/lib/ensureSchema';

const globalForPrisma = globalThis as unknown as {
  prismaGdvnc?: PrismaClient;
  prismaGdvncReady?: Promise<void>;
  prismaGdvncExt?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set.');
}

const base =
  globalForPrisma.prismaGdvnc ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prismaGdvnc = base;
globalForPrisma.prismaGdvncReady ??= applyPendingSchema(base).catch((error) => {
  globalForPrisma.prismaGdvncReady = undefined;
  console.error('applyPendingSchema', error);
  throw error;
});

const prisma =
  globalForPrisma.prismaGdvncExt ??
  (base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await globalForPrisma.prismaGdvncReady;
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient);

globalForPrisma.prismaGdvncExt = prisma;

export { prisma };
export default prisma;
