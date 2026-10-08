import { LandingPageProps } from "@/lib/ts-types/landing";
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


    throw new Error(`CMS "${cmsType}" is not supported`);
}
