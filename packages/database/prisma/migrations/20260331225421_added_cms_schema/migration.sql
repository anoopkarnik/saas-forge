-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cms_schema";

-- CreateTable
CREATE TABLE "cms_schema"."LandingPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logo" TEXT,
    "darkLogo" TEXT,
    "githubLink" TEXT,
    "githubUsername" TEXT,
    "githubRepositoryName" TEXT,
    "donateNowLink" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "appointmentLink" TEXT,
    "codeSnippet" TEXT,
    "videoLink" TEXT,
    "featureHeading" TEXT,
    "featureDescription" TEXT,
    "testimonialHeading" TEXT,
    "testimonialDescription" TEXT,
    "pricingHeading" TEXT,
    "pricingDescription" TEXT,
    "faqHeading" TEXT,
    "faqDescription" TEXT,
    "creator" TEXT,
    "creatorLink" TEXT,
    "supportEmailAddress" TEXT,
    "companyLegalName" TEXT,
    "websiteUrl" TEXT,
    "lastUpdated" TEXT,
    "country" TEXT,
    "contactNumber" TEXT,
    "address" TEXT,
    "version" TEXT,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."HeroImage" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "HeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."Feature" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."Testimonial" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "comment" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."PricingPlan" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" TEXT,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "priceType" TEXT,
    "benefitList" TEXT,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."FAQ" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_schema"."FooterLink" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "type" TEXT,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_title_key" ON "cms_schema"."LandingPage"("title");

-- AddForeignKey
ALTER TABLE "cms_schema"."HeroImage" ADD CONSTRAINT "HeroImage_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_schema"."Feature" ADD CONSTRAINT "Feature_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_schema"."Testimonial" ADD CONSTRAINT "Testimonial_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_schema"."PricingPlan" ADD CONSTRAINT "PricingPlan_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_schema"."FAQ" ADD CONSTRAINT "FAQ_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_schema"."FooterLink" ADD CONSTRAINT "FooterLink_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "cms_schema"."LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
