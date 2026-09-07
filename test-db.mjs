import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable');
async function test() {
  const users = await sql`SELECT count(*) FROM "User" WHERE "classicPp" > 0`;
  console.log('Users with PP:', users);
  
  const levels = await sql`SELECT count(*) FROM "Level" WHERE placement IS NOT NULL`;
  console.log('Levels with placement:', levels);
  
  const timeline = await sql`SELECT count(*) FROM "TimelineEvent"`;
  console.log('Timeline events:', timeline);
  
  const snapshot = await sql`SELECT * FROM "SiteContent"`;
  console.log('SiteContent:', snapshot);
  
  process.exit(0);
}
test();
