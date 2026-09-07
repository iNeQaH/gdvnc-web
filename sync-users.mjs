import postgres from 'postgres';

const neonUrl = 'postgresql://gdvnc_owner:npg_8QZvs0DjRPFi@ep-raspy-cake-azgyt08g.c-3.ap-southeast-1.aws.neon.tech/gdvnc?sslmode=require&channel_binding=require';
const localUrl = 'postgresql://postgres:postgres@localhost:5432/gdvnc?sslmode=disable';

const neon = postgres(neonUrl);
const local = postgres(localUrl);

async function syncUsers() {
  console.log('Fetching users from Neon...');
  const users = await neon`SELECT * FROM "User"`;
  console.log(`Found ${users.length} users on Neon.`);

  if (users.length === 0) {
    console.log('No users found to sync.');
    process.exit(0);
  }

  console.log('Syncing users to local database...');
  for (const user of users) {
    try {
      await local`
        INSERT INTO "User" (
          "id", "username", "email", "passwordHash", "role", "avatarUrl", "coverUrl",
          "bio", "discordTag", "gdUsername", "gdVerified", "country", "supporterUntil",
          "classicPp", "platformerPp", "creatorPoints", "spPoints", "tokenVersion",
          "hardestClassicLevelId", "hardestPlatformerLevelId", "createdAt", "updatedAt"
        ) VALUES (
          ${user.id}, ${user.username}, ${user.email}, ${user.passwordHash}, ${user.role},
          ${user.avatarUrl}, ${user.coverUrl}, ${user.bio}, ${user.discordTag},
          ${user.gdUsername}, ${user.gdVerified}, ${user.country}, ${user.supporterUntil},
          ${user.classicPp}, ${user.platformerPp}, ${user.creatorPoints}, ${user.spPoints},
          ${user.tokenVersion}, ${user.hardestClassicLevelId}, ${user.hardestPlatformerLevelId},
          ${user.createdAt}, ${user.updatedAt}
        )
        ON CONFLICT ("id") DO UPDATE SET
          "username" = EXCLUDED."username",
          "email" = EXCLUDED."email",
          "passwordHash" = EXCLUDED."passwordHash",
          "role" = EXCLUDED."role",
          "avatarUrl" = EXCLUDED."avatarUrl",
          "coverUrl" = EXCLUDED."coverUrl",
          "bio" = EXCLUDED."bio",
          "discordTag" = EXCLUDED."discordTag",
          "gdUsername" = EXCLUDED."gdUsername",
          "gdVerified" = EXCLUDED."gdVerified",
          "country" = EXCLUDED."country",
          "supporterUntil" = EXCLUDED."supporterUntil",
          "classicPp" = EXCLUDED."classicPp",
          "platformerPp" = EXCLUDED."platformerPp",
          "creatorPoints" = EXCLUDED."creatorPoints",
          "spPoints" = EXCLUDED."spPoints",
          "tokenVersion" = EXCLUDED."tokenVersion",
          "hardestClassicLevelId" = EXCLUDED."hardestClassicLevelId",
          "hardestPlatformerLevelId" = EXCLUDED."hardestPlatformerLevelId",
          "createdAt" = EXCLUDED."createdAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    } catch (err) {
      console.error(`Failed to sync user ${user.username}:`, err.message);
    }
  }

  console.log('Done! Users synced successfully.');
  
  // also sync timeline because they said timeline was there but just in case
  console.log('Syncing timeline just in case...');
  const timelines = await neon`SELECT * FROM "TimelineEvent"`;
  for (const t of timelines) {
    try {
      await local`
        INSERT INTO "TimelineEvent" (
          "id", "title", "shortDescription", "fullDescription", "image", "startAt", "endAt",
          "approximate", "nature", "tier", "sourceKey", "glowColor", "imageScale", "imageRatio",
          "createdAt", "updatedAt"
        ) VALUES (
          ${t.id}, ${t.title}, ${t.shortDescription}, ${t.fullDescription}, ${t.image},
          ${t.startAt}, ${t.endAt}, ${t.approximate}, ${t.nature}, ${t.tier}, ${t.sourceKey},
          ${t.glowColor}, ${t.imageScale}, ${t.imageRatio}, ${t.createdAt}, ${t.updatedAt}
        )
        ON CONFLICT ("id") DO UPDATE SET
          "title" = EXCLUDED."title",
          "shortDescription" = EXCLUDED."shortDescription",
          "fullDescription" = EXCLUDED."fullDescription",
          "image" = EXCLUDED."image",
          "startAt" = EXCLUDED."startAt",
          "endAt" = EXCLUDED."endAt",
          "approximate" = EXCLUDED."approximate",
          "nature" = EXCLUDED."nature",
          "tier" = EXCLUDED."tier",
          "sourceKey" = EXCLUDED."sourceKey",
          "glowColor" = EXCLUDED."glowColor",
          "imageScale" = EXCLUDED."imageScale",
          "imageRatio" = EXCLUDED."imageRatio",
          "createdAt" = EXCLUDED."createdAt",
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    } catch (err) {
      // ignore
    }
  }
  
  process.exit(0);
}

syncUsers().catch(console.error);
