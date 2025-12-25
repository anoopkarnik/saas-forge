import { queryAllNotionDatabase } from "@workspace/notion/database/queryDatabase";
import { DocumentationProps } from "../ts-types/doc";

export async function fetchDocumentation():Promise<DocumentationProps> {
    const landingPageResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.LANDING_DATABASE_ID!,
        filters: [{name: "title", type: "title", condition: "contains", value: process.env.NEXT_PUBLIC_SAAS_NAME!}],
        filter_condition: "and",
        sorts: [],
    })
    const landingPageData = landingPageResults.results[0];

    const documentationResults = await queryAllNotionDatabase({
        apiToken: process.env.NOTION_API_TOKEN!,
        database_id: process.env.DOCUMENTATION_DATABASE_ID!,
        filters: [{name: "Landing Page", type: "relation", condition: "contains", value: landingPageData.id}],
        filter_condition: "and",
        sorts: [],
    })

    const Documentation:DocumentationProps = {
        title: landingPageData.title,
        logo: landingPageData.logo[0],
        darkLogo: landingPageData.darkLogo[0],
        docs: documentationResults.results
    }
    

    return Documentation;
}