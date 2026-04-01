import { fetchLandingPageData } from "@/lib/functions/fetchLandingPageData";
import { LandingPageProps } from "@/lib/ts-types/landing";
import { redis } from "@/server/redis";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import { updateNotionPage } from "@workspace/cms/notion/page/updatePage";
import { createNotionPage } from "@workspace/cms/notion/page/createPage";
import { trashPage } from "@workspace/cms/notion/page/trashPage";
import { queryAllNotionDatabase } from "@workspace/cms/notion/database/queryDatabase";
import prisma from "@workspace/database/client";

const LANDING_PAGE_CACHE_KEY = "landing-page:notion:v3";
const LANDING_CACHE_TTL_SECONDS = 3600; // 10 minutes

export const landingRouter = createTRPCRouter({
    getLandingInfoFromNotion: baseProcedure
    .query(async () => {
      if (
        !process.env.UPSTASH_REDIS_REST_URL || 
        !process.env.UPSTASH_REDIS_REST_TOKEN || 
        process.env.NEXT_PUBLIC_CMS === "constant"
      ) {
        const data = await fetchLandingPageData();
        return data;
      }

      const cached = await redis.get<LandingPageProps>(LANDING_PAGE_CACHE_KEY);
      if (cached) {
        return cached;
      }

      const data = await fetchLandingPageData();

      await redis.set(LANDING_PAGE_CACHE_KEY, data, { ex: LANDING_CACHE_TTL_SECONDS });
      return data;

    }),
    updateLandingInfo: baseProcedure
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
        .mutation(async ({ input }) => {
            const cmsType = process.env.NEXT_PUBLIC_CMS;
            const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";

            if (cmsType === "constant") {
                throw new Error("Cannot update landing page data when CMS is set to 'constant'");
            }

            if (cmsType === "postgres") {
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
                    await redis.del(LANDING_PAGE_CACHE_KEY);
                }

                return { success: true };
            }

            if (!process.env.NOTION_API_TOKEN || !process.env.LANDING_DATABASE_ID) {
                throw new Error("Missing Notion API config");
            }
            
            // 1. Fetch the exact ID of the Landing Page being used.
            const landingPageResults = await queryAllNotionDatabase({
                apiToken: process.env.NOTION_API_TOKEN,
                database_id: process.env.LANDING_DATABASE_ID,
                filters: [{name: "title", type: "title", condition: "contains", value: process.env.NEXT_PUBLIC_SAAS_NAME!}],
                filter_condition: "and",
                sorts: [],
            });
            const landingPageData = landingPageResults.results[0];
            if (!landingPageData) throw new Error("Landing Page Notion entry not found");

            const pageId = landingPageData.id;

            // 2. Build properties array
            const properties = [];
            // Navbar & Brand
            if (input.title !== undefined) properties.push({ name: "title", type: "title", value: input.title });
            if (input.logo !== undefined) properties.push({ name: "logo", type: "file_url", value: input.logo });
            if (input.darkLogo !== undefined) properties.push({ name: "darkLogo", type: "file_url", value: input.darkLogo });
            if (input.githubLink !== undefined) properties.push({ name: "githubLink", type: "url", value: input.githubLink });
            if (input.githubUsername !== undefined) properties.push({ name: "githubUsername", type: "text", value: input.githubUsername });
            if (input.githubRepositoryName !== undefined) properties.push({ name: "githubRepositoryName", type: "text", value: input.githubRepositoryName });
            if (input.donateNowLink !== undefined) properties.push({ name: "donateNowLink", type: "url", value: input.donateNowLink });

            // Hero
            if (input.tagline !== undefined) properties.push({ name: "tagline", type: "text", value: input.tagline });
            if (input.description !== undefined) properties.push({ name: "description", type: "text", value: input.description });
            if (input.appointmentLink !== undefined) properties.push({ name: "appointmentLink", type: "url", value: input.appointmentLink });
            if (input.codeSnippet !== undefined) properties.push({ name: "codeSnippet", type: "text", value: input.codeSnippet });
            if (input.videoLink !== undefined) properties.push({ name: "videoLink", type: "url", value: input.videoLink });

            // Sections
            if (input.featureHeading !== undefined) properties.push({ name: "featureHeading", type: "text", value: input.featureHeading });
            if (input.featureDescription !== undefined) properties.push({ name: "featureDescription", type: "text", value: input.featureDescription });
            if (input.testimonialHeading !== undefined) properties.push({ name: "testimonialHeading", type: "text", value: input.testimonialHeading });
            if (input.testimonialDescription !== undefined) properties.push({ name: "testimonialDescription", type: "text", value: input.testimonialDescription });
            if (input.pricingHeading !== undefined) properties.push({ name: "pricingHeading", type: "text", value: input.pricingHeading });
            if (input.pricingDescription !== undefined) properties.push({ name: "pricingDescription", type: "text", value: input.pricingDescription });
            if (input.faqHeading !== undefined) properties.push({ name: "faqHeading", type: "text", value: input.faqHeading });
            if (input.faqDescription !== undefined) properties.push({ name: "faqDescription", type: "text", value: input.faqDescription });

            // Legal & Footer
            if (input.creator !== undefined) properties.push({ name: "creator", type: "text", value: input.creator });
            if (input.creatorLink !== undefined) properties.push({ name: "creatorLink", type: "url", value: input.creatorLink });
            if (input.supportEmailAddress !== undefined) properties.push({ name: "supportEmailAddress", type: "text", value: input.supportEmailAddress });
            if (input.companyLegalName !== undefined) properties.push({ name: "companyLegalName", type: "text", value: input.companyLegalName });
            if (input.websiteUrl !== undefined) properties.push({ name: "websiteUrl", type: "text", value: input.websiteUrl });
            if (input.country !== undefined) properties.push({ name: "country", type: "text", value: input.country });
            if (input.contactNumber !== undefined) properties.push({ name: "contactNumber", type: "text", value: input.contactNumber });
            if (input.address !== undefined) properties.push({ name: "address", type: "text", value: input.address });
            if (input.version !== undefined) properties.push({ name: "version", type: "text", value: input.version });
            if (input.lastUpdated !== undefined) properties.push({ name: "lastUpdated", type: "text", value: input.lastUpdated });

            if (properties.length > 0) {
                await updateNotionPage({
                    apiToken: process.env.NOTION_API_TOKEN,
                    page_id: pageId,
                    properties
                });
            }

            // --- Array Synchronization ---
            const apiToken = process.env.NOTION_API_TOKEN;

            // Helper to sync an array to Notion
            async function syncArray<T extends { id?: string }>(
                dbId: string | undefined,
                items: T[] | undefined,
                mapToProperties: (item: T) => any[]
            ) {
                if (!items || !dbId) return;

                // Fetch current state
                const currentRecords = await queryAllNotionDatabase({
                     apiToken, database_id: dbId,
                     filters: [{name: "Landing Page", type: "relation", condition: "contains", value: pageId}],
                     filter_condition: "and", sorts: []
                });
                const currentIds = currentRecords.results.map((r:any) => r.id);
                const inputIds = items.filter(i => i.id).map(i => i.id);

                // Trash removed
                const toTrash = currentIds.filter((id: string) => !inputIds.includes(id));
                for (const id of toTrash) {
                    await trashPage({ apiToken, page_id: id });
                }

                // Add or Update
                for (const item of items) {
                    const mappedProps = mapToProperties(item);
                    // Append parent relation
                    mappedProps.push({ name: "Landing Page", type: "relation", value: [pageId] });

                    if (item.id) {
                        try {
                            await updateNotionPage({ apiToken, page_id: item.id, properties: mappedProps });
                        } catch (err: any) {
                            // If the page was archived/trashed (stale cache), create a new one instead
                            const errMsg = err?.message || err?.body?.message || "";
                            if (err?.code === "validation_error" && errMsg.includes("archived")) {
                                await createNotionPage({ apiToken, database_id: dbId, properties: mappedProps });
                            } else {
                                throw err;
                            }
                        }
                    } else {
                         await createNotionPage({ apiToken, database_id: dbId, properties: mappedProps });
                    }
                }
            }

            // Sync heroImages
            await syncArray(process.env.HERO_DATABASE_ID, input.heroImages, (img) => [
                { name: "title", type: "title", value: img.title },
                { name: "image", type: "file_url", value: img.imageUrl }
            ]);

            // Sync features
            await syncArray(process.env.FEATURE_DATABASE_ID, input.features, (f) => [
                { name: "title", type: "title", value: f.title },
                { name: "description", type: "text", value: f.description },
                { name: "image", type: "file_url", value: f.imageUrl },
                { name: "category", type: "select", value: f.category || "" }
            ].filter(prop => prop.value !== ""));

            // Sync testimonials
            await syncArray(process.env.TESTIMONIAL_DATABASE_ID, input.testimonials, (t) => [
                { name: "name", type: "title", value: t.name },
                { name: "position", type: "text", value: t.position },
                { name: "comment", type: "text", value: t.comment },
                { name: "image", type: "file_url", value: t.imageUrl },
                { name: "category", type: "select", value: t.category || "" }
            ].filter(prop => prop.value !== ""));

            // Sync plans
            await syncArray(process.env.PRICING_DATABASE_ID, input.plans, (p) => [
                { name: "title", type: "title", value: p.title },
                { name: "price", type: "text", value: p.price },
                { name: "popular", type: "checkbox", value: p.popular },
                { name: "description", type: "text", value: p.description },
                { name: "priceType", type: "select", value: p.priceType || "" },
                { name: "benefitList", type: "text", value: (p.benefitList || []).join(",") }
            ].filter(prop => prop.value !== ""));

            // Sync faqs
            await syncArray(process.env.FAQ_DATABASE_ID, input.faqs, (f) => [
                { name: "question", type: "title", value: f.question },
                { name: "answer", type: "text", value: f.answer }
            ]);

            // 3. Invalidate Cache
            if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
                await redis.del(LANDING_PAGE_CACHE_KEY);
            }

            return { success: true };
        }),
});