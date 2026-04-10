import { DocumentationProps } from "@/lib/ts-types/doc";
import { documentationData, landingPageData } from "@workspace/database/constants";

export async function fetchDocumentationFromLocal(): Promise<DocumentationProps> {
    const title = process.env.NEXT_PUBLIC_SAAS_NAME || landingPageData.navbarSection.title || "";
    
    return {
        title,
        logo: landingPageData.navbarSection.logo || "",
        darkLogo: landingPageData.navbarSection.darkLogo || "",
        docs: documentationData.map((d: any) => ({
            id: d.slug,
            Name: d.title,
            Type: d.type,
            order: d.order,
            "Last edited time": new Date().toISOString(),
            "Created time": new Date().toISOString(),
            slug: d.slug,
        })),
    };
}
