-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MODERATOR', 'USER');

-- CreateEnum
CREATE TYPE "LevelMode" AS ENUM ('CLASSIC', 'PLATFORMER');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "bio" TEXT,
    "discordTag" TEXT,
    "gdUsername" TEXT,
    "gdVerified" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT DEFAULT 'Vietnam',
    "supporterUntil" TIMESTAMP(3),
    "classicPp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformerPp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creatorPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "gdLevelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "LevelMode" NOT NULL DEFAULT 'CLASSIC',
    "difficulty" TEXT NOT NULL,
    "difficultyFace" INTEGER NOT NULL DEFAULT 0,
    "ratingType" TEXT NOT NULL DEFAULT 'NONE',
    "isVN" BOOLEAN NOT NULL DEFAULT false,
    "isChallenge" BOOLEAN NOT NULL DEFAULT false,
    "placement" INTEGER,
    "basePp" DOUBLE PRECISION NOT NULL,
    "minPercent" INTEGER NOT NULL DEFAULT 100,
    "creatorName" TEXT,
    "creatorId" TEXT,
    "verifierName" TEXT,
    "youtubeId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "legacyPlayerName" TEXT,
    "levelId" TEXT NOT NULL,
    "progress" INTEGER,
    "timeMs" INTEGER,
    "videoUrl" TEXT NOT NULL,
    "rawProofUrl" TEXT,
    "hz" INTEGER,
    "fps" INTEGER,
    "device" TEXT,
    "comment" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "prioritySp" INTEGER NOT NULL DEFAULT 0,
    "reviewerId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "bgColor" TEXT,
    "borderColor" TEXT,
    "glowColor" TEXT,
    "tier" TEXT,
    "minPoints" DOUBLE PRECISION,
    "pointsType" TEXT,
    "category" TEXT DEFAULT 'PLAYER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "gdLevelId" INTEGER,
    "levelName" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "badgeGranted" TEXT,
    "cpGranted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "prioritySp" INTEGER NOT NULL DEFAULT 0,
    "reviewerId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gdLevelId" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "minPercent" INTEGER NOT NULL DEFAULT 100,
    "placement" INTEGER,
    "mode" "LevelMode" NOT NULL DEFAULT 'CLASSIC',
    "isVN" BOOLEAN NOT NULL DEFAULT false,
    "isChallenge" BOOLEAN NOT NULL DEFAULT false,
    "difficultyFace" INTEGER NOT NULL DEFAULT 0,
    "ratingType" TEXT NOT NULL DEFAULT 'NONE',
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "prioritySp" INTEGER NOT NULL DEFAULT 0,
    "reviewerId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "LevelSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_classicPp_idx" ON "User"("classicPp" DESC);

-- CreateIndex
CREATE INDEX "User_platformerPp_idx" ON "User"("platformerPp" DESC);

-- CreateIndex
CREATE INDEX "User_creatorPoints_idx" ON "User"("creatorPoints" DESC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_gdUsername_idx" ON "User"("gdUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Level_gdLevelId_key" ON "Level"("gdLevelId");

-- CreateIndex
CREATE INDEX "Level_placement_idx" ON "Level"("placement");

-- CreateIndex
CREATE INDEX "Level_mode_idx" ON "Level"("mode");

-- CreateIndex
CREATE INDEX "Level_isChallenge_idx" ON "Level"("isChallenge");

-- CreateIndex
CREATE INDEX "Record_status_idx" ON "Record"("status");

-- CreateIndex
CREATE INDEX "Record_userId_idx" ON "Record"("userId");

-- CreateIndex
CREATE INDEX "Record_levelId_idx" ON "Record"("levelId");

-- CreateIndex
CREATE INDEX "Record_legacyPlayerName_idx" ON "Record"("legacyPlayerName");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Otp_email_idx" ON "Otp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeCategory_name_key" ON "BadgeCategory"("name");

-- CreateIndex
CREATE INDEX "Badge_sortOrder_idx" ON "Badge"("sortOrder");

-- CreateIndex
CREATE INDEX "Badge_categoryId_idx" ON "Badge"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "CreatorWork_status_idx" ON "CreatorWork"("status");

-- CreateIndex
CREATE INDEX "CreatorWork_userId_idx" ON "CreatorWork"("userId");

-- CreateIndex
CREATE INDEX "LevelSubmission_status_idx" ON "LevelSubmission"("status");

-- CreateIndex
CREATE INDEX "LevelSubmission_userId_idx" ON "LevelSubmission"("userId");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BadgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorWork" ADD CONSTRAINT "CreatorWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorWork" ADD CONSTRAINT "CreatorWork_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelSubmission" ADD CONSTRAINT "LevelSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelSubmission" ADD CONSTRAINT "LevelSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

