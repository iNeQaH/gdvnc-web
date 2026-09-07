import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable');
async function unlock() {
  await sql`UPDATE "SiteContent" SET html = '0' WHERE key = 'site-lock'`;
  console.log('Site unlocked!');
  process.exit(0);
}
unlock();
