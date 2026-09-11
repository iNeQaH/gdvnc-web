import postgres from 'postgres';

const neonUrl = process.env.REMOTE_DATABASE_URL || '';
const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable';

const neon = postgres(neonUrl);
const local = postgres(localUrl);

const tables = [
  'SiteContent',
  'Image',
  'Otp',
  'BadgeCategory',
  'Badge',
  'User', // We will insert User with NULL level IDs first
  'Level',
  'Record',
  'Notification',
  'SiteAnnouncement',
  'AnnouncementRead',
  'UserBadge',
  'CreatorWork',
  'LevelSubmission',
  'HelpRequest',
  'TimelineEvent'
];

async function syncAll() {
  console.log('Disabling foreign key checks on local (Cascade Truncate)...');
  
  for (const table of [...tables].reverse()) {
    console.log(`Truncating ${table}...`);
    await local`TRUNCATE TABLE "${local.unsafe(table)}" CASCADE`;
  }

  let usersToUpdate = [];

  for (const table of tables) {
    console.log(`Fetching ${table} from Neon...`);
    const rows = await neon`SELECT * FROM "${neon.unsafe(table)}"`;
    console.log(`Found ${rows.length} rows for ${table}. Inserting to local...`);
    
    if (rows.length > 0) {
      if (table === 'User') {
        // Save the real level IDs to update later
        usersToUpdate = rows.map(r => ({
          id: r.id,
          c: r.hardestClassicLevelId,
          p: r.hardestPlatformerLevelId
        })).filter(u => u.c || u.p);
        
        // Nullify before insert
        for (const row of rows) {
          row.hardestClassicLevelId = null;
          row.hardestPlatformerLevelId = null;
        }
      }

      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await local`INSERT INTO "${local.unsafe(table)}" ${local(chunk)}`;
      }
    }
  }

  // Restore hardest levels
  console.log('Restoring circular foreign keys for User...');
  for (const u of usersToUpdate) {
    await local`UPDATE "User" SET "hardestClassicLevelId" = ${u.c}, "hardestPlatformerLevelId" = ${u.p} WHERE "id" = ${u.id}`;
  }

  console.log('All tables synced successfully!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error(err);
  process.exit(1);
});
