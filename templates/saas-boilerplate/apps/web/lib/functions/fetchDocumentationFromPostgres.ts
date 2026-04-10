import { DocumentationProps } from "@/lib/ts-types/doc";
import prisma from "@workspace/database/client";

export async function fetchDocumentationFromPostgres(): Promise<DocumentationProps> {
    const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";

    const landingPageData = await prisma.landingPage.findUnique({
        where: {
            title: saasName,
        },
        include: {
            documentations: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    });

    if (!landingPageData) {
        throw new Error(`Landing Page config not found in Postgres for name: ${saasName}`);
    }

    return {
        title: landingPageData.title,
        logo: landingPageData.logo || "",
        darkLogo: landingPageData.darkLogo || "",
        docs: landingPageData.documentations.map((d: any) => ({
            id: d.id,
            Name: d.title,
            Type: d.type || "Guide",
            order: d.order,
            "Last edited time": d.lastUpdated.toISOString(),
            "Created time": d.lastUpdated.toISOString(),
            slug: d.slug,
        })),
    };
}
