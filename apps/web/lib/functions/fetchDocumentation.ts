import { DocumentationProps } from "@/lib/ts-types/doc";
import { fetchDocumentation as fetchDocumentationFromNotion } from "./fetchDocumentationFromNotion";
import { fetchDocumentationFromPostgres } from "./fetchDocumentationFromPostgres";
import { fetchDocumentationFromLocal } from "./fetchDocumentationFromLocal";

export async function fetchDocumentation(): Promise<DocumentationProps> {
    const cmsType = process.env.NEXT_PUBLIC_CMS;

    if (cmsType === "constant") {
        return fetchDocumentationFromLocal();
    }

    if (cmsType === "postgres") {
        return await fetchDocumentationFromPostgres();
    }
    
    return await fetchDocumentationFromNotion();
}
