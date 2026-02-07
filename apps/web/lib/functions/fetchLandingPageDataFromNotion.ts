import { FAQProps, FAQSectionProps, FeatureSectionProps, FooterLinkProps, FooterSectionProps, HeroSectionProps, LandingPageProps, NavbarSectionProps, PricingSectionProps, TestimonialSectionProps } from "@/lib/ts-types/landing";
import { queryAllNotionDatabase } from "@workspace/cms/notion/database/queryDatabase";
import { CancellationRefundPoliciesProps, ContactUsProps, PrivacyPolicyProps, TermsOfServiceProps } from "../ts-types/legal";

export async function fetchLandingPageData():Promise<LandingPageProps> {
    const landingPageResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.LANDING_DATABASE_ID!,
        filters: [{name: "title", type: "title", condition: "contains", value: process.env.NEXT_PUBLIC_SAAS_NAME!}],
        filter_condition: "and",
        sorts: [],
    })
    const landingPageData = landingPageResults.results[0];

    const navbarSection: NavbarSectionProps = {
        title: landingPageData.title,
        logo: landingPageData.logo[0],
        darkLogo: landingPageData.darkLogo[0],
        githubLink: landingPageData.githubLink,
        githubUsername: landingPageData.githubUsername,
        githubRepositoryName: landingPageData.githubRepositoryName,
        donateNowLink: landingPageData.donateNowLink,
    } 
    
    const heroSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.HERO_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const heroSection: HeroSectionProps = {
        tagline: landingPageData.tagline[0],
        description: landingPageData.description[0],
        appointmentLink: landingPageData.appointmentLink,
        codeSnippet: landingPageData.codeSnippet[0],
        heroImages: heroSectionResults.results.map((item:any) => ({
            title: item.title,
            imageUrl: item.image[0],
        }))
    }

    const featureSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.FEATURE_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const featureSection: FeatureSectionProps = {
        heading: landingPageData.featureHeading[0],
        description: landingPageData.featureDescription[0],
        features: featureSectionResults.results.map((item:any) => ({
            title: item.title,
            description: item.description[0],
            imageUrl: item.image[0],
            category: item.category,
        }))
    }

    const testimonialSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.TESTIMONIAL_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const testimonialSection: TestimonialSectionProps = {
        heading: landingPageData.testimonialHeading[0],
        description: landingPageData.testimonialDescription[0],
        testimonials: testimonialSectionResults.results.map((item:any) => ({
            name: item.name,
            title: item.title[0],
            comment: item.comment[0],
            imageUrl: item.image[0],
        }))
    }

    const pricingSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.PRICING_DATABASE_ID!,  
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const pricingSection: PricingSectionProps = {
        heading: landingPageData.pricingHeading[0],
        description: landingPageData.pricingDescription[0],
        plans: pricingSectionResults.results.map((item:any) => ({
            title: item.title,
            price: item.price[0],
            popular: item.popular,
            description: item.description[0],
            priceType: item.priceType,
            benefitList: item.benefitList[0].split(",")
        }))
    }


    const faqSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.FAQ_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const faqSection: FAQSectionProps = {
        heading: landingPageData.faqHeading[0],
        description: landingPageData.faqDescription[0],
        faqs: faqSectionResults.results.map((item:FAQProps) => ({
            question: item.question,
            answer: item.answer[0],
        }))
    }

    const footerSectionResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.FOOTER_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const footerSection: FooterSectionProps = {
        title: landingPageData.title,
        logo: landingPageData.logo[0],
        darkLogo: landingPageData.darkLogo[0],
        creator: landingPageData.creator[0],
        creatorLink: landingPageData.creatorLink,
        links: footerSectionResults.results.map((item:FooterLinkProps) => ({
            label: item.label,
            href: item.href[0],
            type: item.type,
        }))
    }

    const cancellationRefundPolicies:CancellationRefundPoliciesProps = {
        supportEmailAddress: landingPageData.supportEmailAddress[0],
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName[0],
        websiteUrl: landingPageData.websiteUrl[0],
        lastUpdated: landingPageData.lastUpdated[0],
    }

    const privacyPolicy:PrivacyPolicyProps = {
        supportEmailAddress: landingPageData.supportEmailAddress[0],
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName[0],
        country: landingPageData.country[0],
        websiteUrl: landingPageData.websiteUrl[0],
        lastUpdated: landingPageData.lastUpdated[0],
    }

    const contactUs: ContactUsProps = {
        supportEmailAddress: landingPageData.supportEmailAddress[0],
        companyLegalName: landingPageData.companyLegalName[0],
        lastUpdated: landingPageData.lastUpdated[0],
        contactNumber: landingPageData.contactNumber[0],
        address: landingPageData.address[0],
    }

    const termsOfService:TermsOfServiceProps = {
        supportEmailAddress: landingPageData.supportEmailAddress[0],
        siteName: landingPageData.title,
        companyLegalName: landingPageData.companyLegalName[0],
        country: landingPageData.country[0],
        websiteUrl: landingPageData.websiteUrl[0],
        lastUpdated: landingPageData.lastUpdated[0],
        version: landingPageData.version[0],
        address: landingPageData.address[0],
    }

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
        termsOfService

    }
}