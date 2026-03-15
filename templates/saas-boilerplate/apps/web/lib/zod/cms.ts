import * as z from "zod";
import type { LandingPageProps } from "@/lib/ts-types/landing";

// Shared props for all section tab components
export interface SectionTabProps {
    initialData: LandingPageProps | undefined;
    onSave: (values: Partial<CmsFormValues>) => void;
    isSaving: boolean;
}

// --- Per-section schemas (used by individual tab forms) ---

export const navbarFormSchema = z.object({
    title: z.string().optional(),
    logo: z.string().optional(),
    darkLogo: z.string().optional(),
    githubLink: z.string().optional(),
    githubUsername: z.string().optional(),
    githubRepositoryName: z.string().optional(),
    donateNowLink: z.string().optional(),
});
export type NavbarFormValues = z.infer<typeof navbarFormSchema>;

export const heroFormSchema = z.object({
    tagline: z.string().optional(),
    description: z.string().optional(),
    appointmentLink: z.string().optional(),
    codeSnippet: z.string().optional(),
    videoLink: z.string().optional(),
    heroImages: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        imageUrl: z.string()
    })).optional(),
});
export type HeroFormValues = z.infer<typeof heroFormSchema>;

export const featuresFormSchema = z.object({
    featureHeading: z.string().optional(),
    featureDescription: z.string().optional(),
    features: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        description: z.string(),
        category: z.string().optional(),
        imageUrl: z.string()
    })).optional(),
});
export type FeaturesFormValues = z.infer<typeof featuresFormSchema>;

export const testimonialsFormSchema = z.object({
    testimonialHeading: z.string().optional(),
    testimonialDescription: z.string().optional(),
    testimonials: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        position: z.string(),
        comment: z.string(),
        imageUrl: z.string(),
        category: z.string().optional()
    })).optional(),
});
export type TestimonialsFormValues = z.infer<typeof testimonialsFormSchema>;

export const pricingFormSchema = z.object({
    pricingHeading: z.string().optional(),
    pricingDescription: z.string().optional(),
    plans: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        price: z.string(),
        popular: z.boolean(),
        description: z.string(),
        priceType: z.string(),
        benefitList: z.string()
    })).optional(),
});
export type PricingFormValues = z.infer<typeof pricingFormSchema>;

export const faqFormSchema = z.object({
    faqHeading: z.string().optional(),
    faqDescription: z.string().optional(),
    faqs: z.array(z.object({
        id: z.string().optional(),
        question: z.string(),
        answer: z.string()
    })).optional(),
});
export type FaqFormValues = z.infer<typeof faqFormSchema>;

export const legalFormSchema = z.object({
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
});
export type LegalFormValues = z.infer<typeof legalFormSchema>;

// Combined type (union of all section values) - used by the backend mutation
export type CmsFormValues = NavbarFormValues & HeroFormValues & FeaturesFormValues & TestimonialsFormValues & PricingFormValues & FaqFormValues & LegalFormValues;
