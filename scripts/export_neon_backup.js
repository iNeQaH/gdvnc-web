const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Set connection string from command line argument
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing connection string");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    const escapedItems = val.map(item => typeof item === 'string' ? `"${item.replace(/"/g, '\\"')}"` : item);
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::text[]`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // string
  return `'${val.toString().replace(/'/g, "''")}'`;
}

async function exportTable(tableName, rows, stream) {
  if (!rows || rows.length === 0) return;
  
  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');

  stream.write(`-- Data for ${tableName}\n`);
  for (const row of rows) {
    const values = columns.map(col => escapeSql(row[col])).join(', ');
    stream.write(`INSERT INTO "${tableName}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
  }
  stream.write('\n');
}

async function main() {
  const outputPath = path.join(__dirname, '..', 'gdvn_backup.sql');
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  console.log('Starting export from Neon DB...');

  // Set session options
  stream.write('-- GDVN Database Backup\n');
  stream.write('SET statement_timeout = 0;\n');
  stream.write('SET lock_timeout = 0;\n');
  stream.write('SET client_encoding = \'UTF8\';\n');
  stream.write('SET standard_conforming_strings = on;\n\n');

  try {
    const users = await prisma.user.findMany();
    console.log(`Fetched ${users.length} users`);
    await exportTable('User', users, stream);

    const levels = await prisma.level.findMany();
    console.log(`Fetched ${levels.length} levels`);
    await exportTable('Level', levels, stream);

    const records = await prisma.record.findMany();
    console.log(`Fetched ${records.length} records`);
    await exportTable('Record', records, stream);

    const badgeCategories = await prisma.badgeCategory.findMany();
    console.log(`Fetched ${badgeCategories.length} badge categories`);
    await exportTable('BadgeCategory', badgeCategories, stream);

    const badges = await prisma.badge.findMany();
    console.log(`Fetched ${badges.length} badges`);
    await exportTable('Badge', badges, stream);

    const userBadges = await prisma.userBadge.findMany();
    console.log(`Fetched ${userBadges.length} user badges`);
    await exportTable('UserBadge', userBadges, stream);

    const creatorWorks = await prisma.creatorWork.findMany();
    console.log(`Fetched ${creatorWorks.length} creator works`);
    await exportTable('CreatorWork', creatorWorks, stream);

    const levelSubmissions = await prisma.levelSubmission.findMany();
    console.log(`Fetched ${levelSubmissions.length} level submissions`);
    await exportTable('LevelSubmission', levelSubmissions, stream);

    const helpRequests = await prisma.helpRequest.findMany();
    console.log(`Fetched ${helpRequests.length} help requests`);
    await exportTable('HelpRequest', helpRequests, stream);

    const siteContent = await prisma.siteContent.findMany();
    console.log(`Fetched ${siteContent.length} site content items`);
    await exportTable('SiteContent', siteContent, stream);

    const siteAnnouncements = await prisma.siteAnnouncement.findMany();
    console.log(`Fetched ${siteAnnouncements.length} site announcements`);
    await exportTable('SiteAnnouncement', siteAnnouncements, stream);

    const announcementReads = await prisma.announcementRead.findMany();
    console.log(`Fetched ${announcementReads.length} announcement reads`);
    await exportTable('AnnouncementRead', announcementReads, stream);

    const timelineEvents = await prisma.timelineEvent.findMany();
    console.log(`Fetched ${timelineEvents.length} timeline events`);
    await exportTable('TimelineEvent', timelineEvents, stream);

    const otps = await prisma.otp.findMany();
    console.log(`Fetched ${otps.length} otps`);
    await exportTable('Otp', otps, stream);

    const notifications = await prisma.notification.findMany();
    console.log(`Fetched ${notifications.length} notifications`);
    await exportTable('Notification', notifications, stream);

    stream.end();
    console.log(`✅ EXPORT SUCCESSFUL! File saved to: ${outputPath}`);
  } catch (err) {
    console.error('Export error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
