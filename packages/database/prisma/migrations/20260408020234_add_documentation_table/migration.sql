-- CreateTable
CREATE TABLE "cms_schema"."Documentation" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Documentation_slug_key" ON "cms_schema"."Documentation"("slug");

-- AddForeignKey
ALTER TABLE "cms_schema"."Documentation" ADD CONSTRAINT "Documentation_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
