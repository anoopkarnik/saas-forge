import { fetchLandingPageData } from "@/lib/functions/fetchLandingPageData";
import { LandingPageProps } from "@/lib/ts-types/landing";
import { redis } from "@/server/redis";
import { adminProcedure, createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import { getCmsProvider } from "@/lib/cms-provider";
import prisma from "@workspace/database/client";
// scaffold:begin audit_log
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log

const LANDING_CACHE_TTL_SECONDS = 3600; // 10 minutes
const getLandingCacheKey = () =>
    `${(process.env.NEXT_PUBLIC_SAAS_NAME || "landing-page").toLowerCase()}-landing-page:cms:v1`;

export const landingRouter = createTRPCRouter({
    getLandingInfo: baseProcedure
    .query(async () => {
      const cmsProvider = getCmsProvider();

      if (
        !process.env.UPSTASH_REDIS_REST_URL || 
        !process.env.UPSTASH_REDIS_REST_TOKEN || 
        cmsProvider === "constant"
      ) {
        const data = await fetchLandingPageData();
        return data;
      }

      const cached = await redis.get<LandingPageProps>(getLandingCacheKey());
      if (cached) {
        return cached;
      }

      const data = await fetchLandingPageData();

      await redis.set(getLandingCacheKey(), data, { ex: LANDING_CACHE_TTL_SECONDS });
      return data;

    }),
    updateLandingInfo: adminProcedure
        .input(z.object({
            // Navbar & Brand
            title: z.string().optional(),
            logo: z.string().optional(),
            darkLogo: z.string().optional(),
            githubLink: z.string().optional(),
            githubUsername: z.string().optional(),
            githubRepositoryName: z.string().optional(),
            donateNowLink: z.string().optional(),
            
            // Hero
            tagline: z.string().optional(),
            description: z.string().optional(),
            appointmentLink: z.string().optional(),
            codeSnippet: z.string().optional(),
            videoLink: z.string().optional(),

            // Features & Testimonials
            featureHeading: z.string().optional(),
            featureDescription: z.string().optional(),
            testimonialHeading: z.string().optional(),
            testimonialDescription: z.string().optional(),

            // Pricing & FAQ
            pricingHeading: z.string().optional(),
            pricingDescription: z.string().optional(),
            faqHeading: z.string().optional(),
            faqDescription: z.string().optional(),

            // Legal & Footer
            creator: z.string().optional(),
            creatorLink: z.string().optional(),
            supportEmailAddress: z.string().optional(),
            companyLegalName: z.string().optional(),
            websiteUrl: z.string().optional(),
            country: z.string().optional(),
            contactNumber: z.string().optional(),
            address: z.string().optional(),
            version: z.string().optional(),
            lastUpdated: z.string().optional(),

            // Relational Arrays
            heroImages: z.array(z.object({
                id: z.string().optional(),
                title: z.string(),
                imageUrl: z.string()
            })).optional(),
            features: z.array(z.object({
                id: z.string().optional(),
                title: z.string(),
                description: z.string(),
                category: z.string().optional(),
                imageUrl: z.string()
            })).optional(),
            testimonials: z.array(z.object({
                id: z.string().optional(),
                name: z.string(),
                position: z.string(),
                comment: z.string(),
                imageUrl: z.string(),
                category: z.string().optional()
            })).optional(),
            plans: z.array(z.object({
                id: z.string().optional(),
                title: z.string(),
                price: z.string(),
                popular: z.boolean(),
                description: z.string(),
                priceType: z.string(),
                benefitList: z.array(z.string())
            })).optional(),
            faqs: z.array(z.object({
                id: z.string().optional(),
                question: z.string(),
                answer: z.string()
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const cmsProvider = getCmsProvider();
            const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";

            if (cmsProvider === "constant") {
                throw new Error("Cannot update landing page data when CMS is set to 'constant'");
            }

            if (cmsProvider === "postgres") {
                const existingPage = await prisma.landingPage.findUnique({
                    where: { title: saasName }
                });

                const pageData: any = {};
                if (input.title !== undefined) pageData.title = input.title;
                if (input.logo !== undefined) pageData.logo = input.logo;
                if (input.darkLogo !== undefined) pageData.darkLogo = input.darkLogo;
                if (input.githubLink !== undefined) pageData.githubLink = input.githubLink;
                if (input.githubUsername !== undefined) pageData.githubUsername = input.githubUsername;
                if (input.githubRepositoryName !== undefined) pageData.githubRepositoryName = input.githubRepositoryName;
                if (input.donateNowLink !== undefined) pageData.donateNowLink = input.donateNowLink;

                if (input.tagline !== undefined) pageData.tagline = input.tagline;
                if (input.description !== undefined) pageData.description = input.description;
                if (input.appointmentLink !== undefined) pageData.appointmentLink = input.appointmentLink;
                if (input.codeSnippet !== undefined) pageData.codeSnippet = input.codeSnippet;
                if (input.videoLink !== undefined) pageData.videoLink = input.videoLink;

                if (input.featureHeading !== undefined) pageData.featureHeading = input.featureHeading;
                if (input.featureDescription !== undefined) pageData.featureDescription = input.featureDescription;
                if (input.testimonialHeading !== undefined) pageData.testimonialHeading = input.testimonialHeading;
                if (input.testimonialDescription !== undefined) pageData.testimonialDescription = input.testimonialDescription;
                if (input.pricingHeading !== undefined) pageData.pricingHeading = input.pricingHeading;
                if (input.pricingDescription !== undefined) pageData.pricingDescription = input.pricingDescription;
                if (input.faqHeading !== undefined) pageData.faqHeading = input.faqHeading;
                if (input.faqDescription !== undefined) pageData.faqDescription = input.faqDescription;

                if (input.creator !== undefined) pageData.creator = input.creator;
                if (input.creatorLink !== undefined) pageData.creatorLink = input.creatorLink;
                if (input.supportEmailAddress !== undefined) pageData.supportEmailAddress = input.supportEmailAddress;
                if (input.companyLegalName !== undefined) pageData.companyLegalName = input.companyLegalName;
                if (input.websiteUrl !== undefined) pageData.websiteUrl = input.websiteUrl;
                if (input.country !== undefined) pageData.country = input.country;
                if (input.contactNumber !== undefined) pageData.contactNumber = input.contactNumber;
                if (input.address !== undefined) pageData.address = input.address;
                if (input.version !== undefined) pageData.version = input.version;
                if (input.lastUpdated !== undefined) pageData.lastUpdated = input.lastUpdated;

                let pageId = "";
                if (existingPage) {
                    await prisma.landingPage.update({ where: { title: saasName }, data: pageData });
                    pageId = existingPage.id;
                } else {
                    pageData.title = pageData.title || saasName;
                    const newPage = await prisma.landingPage.create({ data: pageData });
                    pageId = newPage.id;
                }

                if (input.heroImages !== undefined) {
                    await prisma.heroImage.deleteMany({ where: { landingPageId: pageId } });
                    if (input.heroImages.length > 0) {
                        await prisma.heroImage.createMany({
                            data: input.heroImages.map(img => ({ landingPageId: pageId, title: img.title, imageUrl: img.imageUrl }))
                        });
                    }
                }
                if (input.features !== undefined) {
                    await prisma.feature.deleteMany({ where: { landingPageId: pageId } });
                    if (input.features.length > 0) {
                        await prisma.feature.createMany({
                            data: input.features.map(f => ({ landingPageId: pageId, title: f.title, description: f.description, imageUrl: f.imageUrl, category: f.category }))
                        });
                    }
                }
                if (input.testimonials !== undefined) {
                    await prisma.testimonial.deleteMany({ where: { landingPageId: pageId } });
                    if (input.testimonials.length > 0) {
                        await prisma.testimonial.createMany({
                            data: input.testimonials.map(t => ({ landingPageId: pageId, name: t.name, position: t.position, comment: t.comment, imageUrl: t.imageUrl, category: t.category }))
                        });
                    }
                }
                if (input.plans !== undefined) {
                    await prisma.pricingPlan.deleteMany({ where: { landingPageId: pageId } });
                    if (input.plans.length > 0) {
                        await prisma.pricingPlan.createMany({
                            data: input.plans.map(p => ({
                                landingPageId: pageId,
                                title: p.title,
                                price: p.price,
                                popular: p.popular,
                                description: p.description,
                                priceType: p.priceType,
                                benefitList: p.benefitList.join(",")
                            }))
                        });
                    }
                }
                if (input.faqs !== undefined) {
                    await prisma.fAQ.deleteMany({ where: { landingPageId: pageId } });
                    if (input.faqs.length > 0) {
                        await prisma.fAQ.createMany({
                            data: input.faqs.map(f => ({ landingPageId: pageId, question: f.question, answer: f.answer }))
                        });
                    }
                }

                if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
                    await redis.del(getLandingCacheKey());
                }

                // scaffold:begin audit_log
                await audit(prisma, "cms.landing_updated", { actor: userActor(ctx.session.user.id), metadata: {}, headers: ctx.headers });
                // scaffold:end audit_log
                return { success: true };
            }


            throw new Error(`Cannot update landing page data for CMS "${cmsProvider}"`);
        }),
});
