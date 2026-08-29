-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "html" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);
