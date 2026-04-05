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
    codeSnippet?: string;
    heroImages?: HeroImageProps[];
    videoLink?: string;
}

export interface HeroImageProps {
    id: string;
    title: string;
    imageUrl: string;
}

export interface FeatureSectionProps {
    heading: string;
    description: string;
    features: FeatureProps[];
}

export interface FeatureProps {
    id: string;
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
    id: string;
    name: string;
    position: string;
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
    id: string;
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
    id: string;
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
    id: string;
    label: string;
    href: string;
    type: string;
}