require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

prisma.user
  .updateMany({
    where: { email: { not: null }, createdAt: { lte: cutoff } },
    data: { email: null },
  })
  .then((r) => {
    console.log('cleared', r.count);
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
