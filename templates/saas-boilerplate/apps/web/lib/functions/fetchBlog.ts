import { BlogIndexProps, BlogPost } from "@/lib/ts-types/blog";
import { fetchBlogIndexFromPostgres, fetchBlogPostFromPostgres } from "./fetchBlogFromPostgres";
import { fetchBlogIndexFromLocal, fetchBlogPostFromLocal } from "./fetchBlogFromLocal";
import { getCmsProvider } from "@/lib/cms-provider";

export async function fetchBlogIndex(): Promise<BlogIndexProps> {
    const cmsType = getCmsProvider();

    if (cmsType === "constant") {
        return fetchBlogIndexFromLocal();
    }

    if (cmsType === "postgres") {
        return await fetchBlogIndexFromPostgres();
    }

    throw new Error(`CMS "${cmsType}" is not supported`);
}

/** A published post, or null for an unknown slug, a draft or a missing file. */
export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
    const cmsType = getCmsProvider();

    if (cmsType === "constant") {
        return fetchBlogPostFromLocal(slug);
    }

    if (cmsType === "postgres") {
        return await fetchBlogPostFromPostgres(slug);
    }

    throw new Error(`CMS "${cmsType}" is not supported`);
}
