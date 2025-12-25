import { CancellationRefundPoliciesProps, ContactUsProps, PrivacyPolicyProps, TermsOfServiceProps } from "./legal";

export interface LandingPageProps {
    navbarSection: NavbarSectionProps;
    heroSection: HeroSectionProps;
    featureSection: FeatureSectionProps;
    testimonialSection: TestimonialSectionProps;
    pricingSection: PricingSectionProps;
    faqSection: FAQSectionProps;
    footerSection: FooterSectionProps;
    cancellationRefundPolicies: CancellationRefundPoliciesProps;
    privacyPolicy: PrivacyPolicyProps;
    termsOfService: TermsOfServiceProps;
    contactUs: ContactUsProps;
}

export interface NavbarSectionProps {
    githubLink: string;
    githubUsername: string;
    githubRepositoryName: string;
    donateNowLink?: string;
    title: string;
    logo: string;
    darkLogo: string;
  }

export interface HeroSectionProps {
    appointmentLink?: string;
    tagline?: string;
    description?: string;
    heroImages: HeroImageProps[];
}

export interface HeroImageProps {
    title: string;
    imageUrl: string;
}

export interface FeatureSectionProps {
    heading: string;
    description: string;
    features: FeatureProps[];
}

export interface FeatureProps {
    title: string;
    description: string;
    category?: string;
    imageUrl: string;
}

export interface TestimonialSectionProps {
    heading: string;
    description: string;
    testimonials: TestimonialProps[];
}

export interface TestimonialProps {
    name: string;
    title: string;
    company?: string;
    comment: string;
    imageUrl: string;
}

export interface PricingSectionProps {
    heading: string;
    description: string;
    plans: PricingPlanProps[];
}

export interface PricingPlanProps {
    title: string;
    popular: boolean;
    price: string;
    description: string;
    priceType: string;
    benefitList: string[];
}

export interface FAQSectionProps {
    heading: string;
    description: string;
    faqs: FAQProps[];
}

export interface FAQProps {
    question: string;
    answer: string;
}

export interface FooterSectionProps {
    creator: string;
    creatorLink: string;
    title: string;
    logo: string;
    darkLogo: string;
    links: FooterLinkProps[];
}

export interface FooterLinkProps {
    label: string;
    href: string;
    type: string;
}