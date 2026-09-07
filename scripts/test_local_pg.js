const { PrismaClient } = require('@prisma/client');

const passwords = ['postgres', 'admin', '123456', 'root', '12345678', 'MatKhauBaoMatCuaBan123!', 'ineqah', 'gdvn'];

async function test() {
  for (const pw of passwords) {
    const url = `postgresql://postgres:${encodeURIComponent(pw)}@localhost:5432/postgres?sslmode=disable`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$connect();
      console.log('✅ FOUND LOCAL POSTGRES PASSWORD:', pw);
      await prisma.$disconnect();
      return pw;
    } catch (e) {
      await prisma.$disconnect();
    }
  }
  console.log('❌ Could not connect with standard default passwords.');
  return null;
}

test();
