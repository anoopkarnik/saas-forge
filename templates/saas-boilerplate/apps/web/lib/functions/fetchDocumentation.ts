import { DocumentationProps } from "@/lib/ts-types/doc";
// scaffold:begin cms.notion
import { fetchDocumentation as fetchDocumentationFromNotion } from "./fetchDocumentationFromNotion";
// scaffold:end cms.notion
import { fetchDocumentationFromPostgres } from "./fetchDocumentationFromPostgres";
import { fetchDocumentationFromLocal } from "./fetchDocumentationFromLocal";
import { getCmsProvider } from "@/lib/cms-provider";

export async function fetchDocumentation(): Promise<DocumentationProps> {
    const cmsType = getCmsProvider();

    if (cmsType === "constant") {
        return fetchDocumentationFromLocal();
    }

    if (cmsType === "postgres") {
        return await fetchDocumentationFromPostgres();
    }

    // scaffold:begin cms.notion
    if (cmsType === "notion") {
        return await fetchDocumentationFromNotion();
    }
    // scaffold:end cms.notion

    throw new Error(`CMS "${cmsType}" is not supported`);
}
