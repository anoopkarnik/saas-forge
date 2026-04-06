import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import prisma from "./client";

function loadSeedEnv() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = path.dirname(currentFilePath);
  const repoRootPath = path.resolve(currentDirPath, "../../..");

  dotenv.config({ path: path.join(repoRootPath, "packages/database/.env") });
  dotenv.config({ path: path.join(repoRootPath, "apps/web/.env") });
}

async function main() {
  loadSeedEnv();

  const saasName = process.env.NEXT_PUBLIC_SAAS_NAME;
  if (!saasName) {
    throw new Error(
      "NEXT_PUBLIC_SAAS_NAME is not set. Add it to apps/web/.env before running `pnpm seed`."
    );
  }

  const { landingPageData } = await import("./constants");

  console.log(`Seeding database for SaaS Name: ${saasName}`);

  // We are upserting the base LandingPage row based on title
  const landingPage = await prisma.landingPage.upsert({
    where: { title: saasName },
    update: {
      logo: landingPageData.navbarSection?.logo,
      darkLogo: landingPageData.navbarSection?.darkLogo,
      githubLink: landingPageData.navbarSection?.githubLink,
      githubUsername: landingPageData.navbarSection?.githubUsername,
      githubRepositoryName: landingPageData.navbarSection?.githubRepositoryName,
      donateNowLink: landingPageData.navbarSection?.donateNowLink,

      tagline: landingPageData.heroSection?.tagline,
      description: landingPageData.heroSection?.description,
      appointmentLink: landingPageData.heroSection?.appointmentLink,
      codeSnippet: landingPageData.heroSection?.codeSnippet,
      videoLink: landingPageData.heroSection?.videoLink,

      featureHeading: landingPageData.featureSection?.heading,
      featureDescription: landingPageData.featureSection?.description,
      testimonialHeading: landingPageData.testimonialSection?.heading,
      testimonialDescription: landingPageData.testimonialSection?.description,
      pricingHeading: landingPageData.pricingSection?.heading,
      pricingDescription: landingPageData.pricingSection?.description,
      faqHeading: landingPageData.faqSection?.heading,
      faqDescription: landingPageData.faqSection?.description,

      creator: landingPageData.footerSection?.creator,
      creatorLink: landingPageData.footerSection?.creatorLink,

      supportEmailAddress: landingPageData.contactUs?.supportEmailAddress,
      companyLegalName: landingPageData.contactUs?.companyLegalName,
      websiteUrl: landingPageData.termsOfService?.websiteUrl,
      lastUpdated: landingPageData.termsOfService?.lastUpdated,
      country: landingPageData.termsOfService?.country,
      contactNumber: landingPageData.contactUs?.contactNumber,
      address: landingPageData.contactUs?.address,
      version: landingPageData.termsOfService?.version,
    },
    create: {
      title: saasName,
      logo: landingPageData.navbarSection?.logo,
      darkLogo: landingPageData.navbarSection?.darkLogo,
      githubLink: landingPageData.navbarSection?.githubLink,
      githubUsername: landingPageData.navbarSection?.githubUsername,
      githubRepositoryName: landingPageData.navbarSection?.githubRepositoryName,
      donateNowLink: landingPageData.navbarSection?.donateNowLink,

      tagline: landingPageData.heroSection?.tagline,
      description: landingPageData.heroSection?.description,
      appointmentLink: landingPageData.heroSection?.appointmentLink,
      codeSnippet: landingPageData.heroSection?.codeSnippet,
      videoLink: landingPageData.heroSection?.videoLink,

      featureHeading: landingPageData.featureSection?.heading,
      featureDescription: landingPageData.featureSection?.description,
      testimonialHeading: landingPageData.testimonialSection?.heading,
      testimonialDescription: landingPageData.testimonialSection?.description,
      pricingHeading: landingPageData.pricingSection?.heading,
      pricingDescription: landingPageData.pricingSection?.description,
      faqHeading: landingPageData.faqSection?.heading,
      faqDescription: landingPageData.faqSection?.description,

      creator: landingPageData.footerSection?.creator,
      creatorLink: landingPageData.footerSection?.creatorLink,

      supportEmailAddress: landingPageData.contactUs?.supportEmailAddress,
      companyLegalName: landingPageData.contactUs?.companyLegalName,
      websiteUrl: landingPageData.termsOfService?.websiteUrl,
      lastUpdated: landingPageData.termsOfService?.lastUpdated,
      country: landingPageData.termsOfService?.country,
      contactNumber: landingPageData.contactUs?.contactNumber,
      address: landingPageData.contactUs?.address,
      version: landingPageData.termsOfService?.version,
    }
  });

  const pageId = landingPage.id;

  // Sync related models (overwrite existing completely)
  
  // Hero Images
  await prisma.heroImage.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.heroSection?.heroImages?.length) {
    await prisma.heroImage.createMany({
      data: landingPageData.heroSection.heroImages.map((img: any) => ({
        landingPageId: pageId,
        title: img.title,
        imageUrl: img.imageUrl,
      }))
    });
  }

  // Features
  await prisma.feature.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.featureSection?.features?.length) {
    await prisma.feature.createMany({
      data: landingPageData.featureSection.features.map((f: any) => ({
        landingPageId: pageId,
        title: f.title,
        description: f.description,
        imageUrl: f.imageUrl,
        category: f.category,
      }))
    });
  }

  // Testimonials
  await prisma.testimonial.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.testimonialSection?.testimonials?.length) {
    await prisma.testimonial.createMany({
      data: landingPageData.testimonialSection.testimonials.map((t: any) => ({
        landingPageId: pageId,
        name: t.name,
        position: t.position,
        comment: t.comment,
        imageUrl: t.imageUrl,
        category: t.category,
      }))
    });
  }

  // Plans
  await prisma.pricingPlan.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.pricingSection?.plans?.length) {
    await prisma.pricingPlan.createMany({
      data: landingPageData.pricingSection.plans.map((p: any) => ({
        landingPageId: pageId,
        title: p.title,
        price: p.price,
        popular: p.popular || false,
        description: p.description,
        priceType: p.priceType,
        benefitList: p.benefitList ? p.benefitList.join(",") : "",
      }))
    });
  }

  // FAQs
  await prisma.fAQ.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.faqSection?.faqs?.length) {
    await prisma.fAQ.createMany({
      data: landingPageData.faqSection.faqs.map((f: any) => ({
        landingPageId: pageId,
        question: f.question,
        answer: f.answer,
      }))
    });
  }

  // Footer Links
  await prisma.footerLink.deleteMany({ where: { landingPageId: pageId } });
  if (landingPageData.footerSection?.links?.length) {
    await prisma.footerLink.createMany({
      data: landingPageData.footerSection.links.map((link: any) => ({
        landingPageId: pageId,
        label: link.label,
        href: link.href,
        type: link.type,
      }))
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
