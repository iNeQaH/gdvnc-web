import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaGdvnc?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set.');
}

export const prisma =
  globalForPrisma.prismaGdvnc ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prismaGdvnc = prisma;

export default prisma;
