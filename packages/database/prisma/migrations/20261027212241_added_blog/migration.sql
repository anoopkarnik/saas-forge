-- CreateTable
CREATE TABLE "cms_schema"."BlogPost" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "cms_schema"."BlogPost"("slug");

-- AddForeignKey
ALTER TABLE "cms_schema"."BlogPost" ADD CONSTRAINT "BlogPost_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
