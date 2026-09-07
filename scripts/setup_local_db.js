const { PrismaClient } = require('@prisma/client');

async function test() {
  const url = `postgresql://postgres@127.0.0.1:5432/postgres?sslmode=disable`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$connect();
    console.log('✅ CONNECTED TO LOCAL POSTGRES WITHOUT PASSWORD!');
    await prisma.$executeRawUnsafe(`ALTER USER postgres WITH PASSWORD 'postgres';`);
    console.log('✅ Set user "postgres" password to "postgres"');
    await prisma.$executeRawUnsafe(`CREATE DATABASE gdvnc;`).catch(() => console.log('Database gdvnc exists or created.'));
    await prisma.$disconnect();
    return true;
  } catch (e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    return false;
  }
}

test();
