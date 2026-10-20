import { DocumentationProps } from "@/lib/ts-types/doc";
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


    throw new Error(`CMS "${cmsType}" is not supported`);
}
