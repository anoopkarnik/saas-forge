const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type LandingData = {
    navbarSection: {
        title?: string;
        logo?: string;
        darkLogo?: string;
        githubLink?: string;
        githubUsername?: string;
        githubRepositoryName?: string;
        donateNowLink?: string;
    };
    heroSection: {
        tagline?: string;
        description?: string;
        appointmentLink?: string;
        codeSnippet?: string;
        videoLink?: string;
        heroImages?: Array<{ id?: string; title: string; imageUrl: string }>;
    };
    featureSection: {
        heading?: string;
        description?: string;
        features?: Array<{
            id?: string;
            title: string;
            description: string;
            category?: string;
            imageUrl: string;
        }>;
    };
    testimonialSection: {
        heading?: string;
        description?: string;
        testimonials?: Array<{
            id?: string;
            name: string;
            position: string;
            comment: string;
            imageUrl: string;
            category?: string;
        }>;
    };
    pricingSection: {
        heading?: string;
        description?: string;
        plans?: Array<{
            id?: string;
            title: string;
            price: string;
            popular: boolean;
            description: string;
            priceType: string;
            benefitList: string[] | string;
        }>;
    };
    faqSection: {
        heading?: string;
        description?: string;
        faqs?: Array<{
            id?: string;
            question: string;
            answer: string;
        }>;
    };
    footerSection: {
        creator?: string;
        creatorLink?: string;
    };
    contactUs: {
        supportEmailAddress?: string;
        companyLegalName?: string;
        contactNumber?: string;
        address?: string;
    };
    termsOfService: {
        websiteUrl?: string;
        country?: string;
        version?: string;
        lastUpdated?: string;
    };
};

export async function fetchLandingData(): Promise<LandingData> {
    const res = await fetch(
        `${baseURL}/api/trpc/landing.getLandingInfoFromNotion`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch CMS data");
    }

    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

export async function updateLandingData(input: Record<string, any>): Promise<void> {
    const url = `${baseURL}/api/trpc/landing.updateLandingInfo`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        const message =
            body?.error?.json?.message ??
            body?.error?.message ??
            "Failed to update CMS data";
        throw new Error(message);
    }

    // tRPC wraps errors inside a 200 response in some configurations
    if (body?.error) {
        const message =
            body.error?.json?.message ??
            body.error?.message ??
            "Update failed on the server";
        throw new Error(message);
    }
}
