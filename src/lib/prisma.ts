import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ensureDbSchema } from '@/lib/ensureSchema';

const globalForPrisma = globalThis as unknown as {
  prismaGdvnc?: PrismaClient;
  prismaGdvncBase?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set.');
}

const baseClient =
  globalForPrisma.prismaGdvncBase ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

export const prisma = (
  globalForPrisma.prismaGdvnc ??
  baseClient.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        await ensureDbSchema(baseClient);
        return query(args);
      },
    },
  })
) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGdvncBase = baseClient;
  globalForPrisma.prismaGdvnc = prisma as unknown as PrismaClient;
}

export default prisma;
