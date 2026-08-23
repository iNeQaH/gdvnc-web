import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaGdvnc?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/gdvnc';

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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaGdvnc = prisma;

export default prisma;
