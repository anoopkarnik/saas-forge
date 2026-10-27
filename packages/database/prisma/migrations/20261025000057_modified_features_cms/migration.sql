-- AlterTable
ALTER TABLE "cms_schema"."Feature" ADD COLUMN     "details" JSONB,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cms_schema"."LandingPage" ADD COLUMN     "featureGroups" JSONB;
