import {
    FAQProps,
    FAQSectionProps,
    FeatureProps,
    FeatureSectionProps,
    FooterLinkProps,
    FooterSectionProps,
    HeroImageProps,
    HeroSectionProps,
    LandingPageProps,
    NavbarSectionProps,
    PricingPlanProps,
    PricingSectionProps,
    TestimonialProps,
    TestimonialSectionProps,
} from "@/lib/ts-types/landing";
import { CancellationRefundPoliciesProps, ContactUsProps, PrivacyPolicyProps, TermsOfServiceProps } from "@/lib/ts-types/legal";
import prisma from "@workspace/database/client";

export async function fetchLandingPageDataFromPostgres(): Promise<LandingPageProps> {
    const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";

    const landingPageData = await prisma.landingPage.findUnique({
        where: {
            title: saasName,
        },
        include: {
            heroImages: true,
            features: true,
            testimonials: true,
            pricingPlans: true,
            faqs: true,
            footerLinks: true,
        },
    });

    if (!landingPageData) {
        throw new Error(`Landing Page config not found in Postgres for name: ${saasName}`);
    }

    const navbarSection: NavbarSectionProps = {
        title: landingPageData.title,
        logo: landingPageData.logo || "",
        darkLogo: landingPageData.darkLogo || "",
        githubLink: landingPageData.githubLink || "",
        githubUsername: landingPageData.githubUsername?.trim() || "",
        githubRepositoryName: landingPageData.githubRepositoryName?.trim() || "",
        donateNowLink: landingPageData.donateNowLink || "",
    };

    const heroSection: HeroSectionProps = {
        tagline: landingPageData.tagline || "",
        description: landingPageData.description || "",
        appointmentLink: landingPageData.appointmentLink || "",
        codeSnippet: landingPageData.codeSnippet || "",
        heroImages: landingPageData.heroImages.map((item: any) => ({
            id: item.id,
            title: item.title || "",
            imageUrl: item.imageUrl || "",
        })),
        videoLink: landingPageData.videoLink || "",
    };

    const featureSection: FeatureSectionProps = {
        heading: landingPageData.featureHeading || "",
        description: landingPageData.featureDescription || "",
        features: landingPageData.features.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description || "",
            imageUrl: item.imageUrl || "",
            category: item.category || "",
        })),
    };

    const testimonialSection: TestimonialSectionProps = {
        heading: landingPageData.testimonialHeading || "",
        description: landingPageData.testimonialDescription || "",
        testimonials: landingPageData.testimonials.map((item: any) => ({
            id: item.id,
            name: item.name,
            position: item.position || "",
            comment: item.comment || "",
            imageUrl: item.imageUrl || "",
            category: item.category || "",
        })),
    };

    const pricingSection: PricingSectionProps = {
        heading: landingPageData.pricingHeading || "",
        description: landingPageData.pricingDescription || "",
        plans: landingPageData.pricingPlans.map((item: any) => ({
            id: item.id,
            title: item.title,
            price: item.price || "",
            popular: item.popular,
            description: item.description || "",
            priceType: item.priceType || "",
            benefitList: item.benefitList ? item.benefitList.split(",") : [],
        })),
    };

    const faqSection: FAQSectionProps = {
        heading: landingPageData.faqHeading || "",
        description: landingPageData.faqDescription || "",
        faqs: landingPageData.faqs.map((item: any) => ({
            id: item.id,
            question: item.question,
            answer: item.answer || "",
        })),
    };

    const footerSection: FooterSectionProps = {
        title: landingPageData.title,
        logo: landingPageData.logo || "",
        darkLogo: landingPageData.darkLogo || "",
        creator: landingPageData.creator || "",
        creatorLink: landingPageData.creatorLink || "",
        links: landingPageData.footerLinks.map((item: any) => ({
            id: item.id,
            label: item.label,
            href: item.href || "",
            type: item.type || "",
        })),
    };

    const cancellationRefundPolicies: CancellationRefundPoliciesProps = {
        supportEmailAddress: landingPageData.supportEmailAddress || "",
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName || "",
        websiteUrl: landingPageData.websiteUrl || "",
        lastUpdated: landingPageData.lastUpdated || "",
    };

    const privacyPolicy: PrivacyPolicyProps = {
        supportEmailAddress: landingPageData.supportEmailAddress || "",
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName || "",
        country: landingPageData.country || "",
        websiteUrl: landingPageData.websiteUrl || "",
        lastUpdated: landingPageData.lastUpdated || "",
    };

    const contactUs: ContactUsProps = {
        supportEmailAddress: landingPageData.supportEmailAddress || "",
        companyLegalName: landingPageData.companyLegalName || "",
        lastUpdated: landingPageData.lastUpdated || "",
        contactNumber: landingPageData.contactNumber || "",
        address: landingPageData.address || "",
    };

    const termsOfService: TermsOfServiceProps = {
        supportEmailAddress: landingPageData.supportEmailAddress || "",
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName || "",
        country: landingPageData.country || "",
        websiteUrl: landingPageData.websiteUrl || "",
        lastUpdated: landingPageData.lastUpdated || "",
        version: landingPageData.version || "",
        address: landingPageData.address || "",
    };

    return {
        navbarSection,
        heroSection,
        featureSection,
        testimonialSection,
        pricingSection,
        faqSection,
        footerSection,
        cancellationRefundPolicies,
        privacyPolicy,
        contactUs,
        termsOfService,
    };
}
