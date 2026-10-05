import { LandingPageProps } from "@/lib/ts-types/landing";
// scaffold:begin cms.notion
import { fetchLandingPageData as fetchLandingPageDataFromNotion } from "./fetchLandingPageDataFromNotion";
// scaffold:end cms.notion
import { fetchLandingPageDataFromPostgres } from "./fetchLandingPageDataFromPostgres";
import { landingPageData } from "@workspace/database/constants";
import { getCmsProvider } from "@/lib/cms-provider";

export async function fetchLandingPageData(): Promise<LandingPageProps> {
    const cmsType = getCmsProvider();

    if (cmsType === "constant") {
        return landingPageData as LandingPageProps;
    }

    if (cmsType === "postgres") {
        return await fetchLandingPageDataFromPostgres();
    }

    // scaffold:begin cms.notion
    if (cmsType === "notion") {
        return await fetchLandingPageDataFromNotion();
    }
    // scaffold:end cms.notion

    throw new Error(`CMS "${cmsType}" is not supported`);
}
