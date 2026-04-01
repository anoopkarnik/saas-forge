import { LandingPageProps } from "@/lib/ts-types/landing";
import { fetchLandingPageData as fetchLandingPageDataFromNotion } from "./fetchLandingPageDataFromNotion";
import { fetchLandingPageDataFromPostgres } from "./fetchLandingPageDataFromPostgres";
import { landingPageData } from "@workspace/database/constants";

export async function fetchLandingPageData(): Promise<LandingPageProps> {
    const cmsType = process.env.NEXT_PUBLIC_CMS;

    if (cmsType === "constant") {
        return landingPageData as LandingPageProps;
    }

    if (cmsType === "postgres") {
        return await fetchLandingPageDataFromPostgres();
    }
    
    return await fetchLandingPageDataFromNotion();
}
