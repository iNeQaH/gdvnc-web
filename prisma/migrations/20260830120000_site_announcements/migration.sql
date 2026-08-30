-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'ADMIN', 'MODERATOR', 'SUPPORTER', 'USERS');

-- CreateTable
CREATE TABLE "SiteAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "targetUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateIndex
CREATE INDEX "SiteAnnouncement_createdAt_idx" ON "SiteAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "SiteAnnouncement_audience_idx" ON "SiteAnnouncement"("audience");

-- CreateIndex
CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");

-- AddForeignKey
ALTER TABLE "SiteAnnouncement" ADD CONSTRAINT "SiteAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "SiteAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
