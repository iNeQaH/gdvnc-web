const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function restore() {
  const psqlPath = 'D:\\Programs\\PostgreSQL\\bin\\psql.exe';
  const localGdvncUrl = 'postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable';

  console.log('1. Pushing Prisma schema to local database "gdvnc"...');
  try {
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: localGdvncUrl, DIRECT_URL: localGdvncUrl }
    });
    console.log('✅ Schema pushed successfully!');
  } catch (err) {
    console.error('Error pushing schema:', err.message);
  }

  console.log('2. Importing gdvn_backup.sql data using psql.exe...');
  const backupPath = path.join(__dirname, '..', 'gdvn_backup.sql');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found at:', backupPath);
    return;
  }

  try {
    const cmd = `"${psqlPath}" "${localGdvncUrl}" -f "${backupPath}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('🎉 SUCCESS! Entire database backup imported into local PostgreSQL!');
  } catch (err) {
    console.error('Error importing backup:', err.message);
  }
}

restore().catch(console.error);
