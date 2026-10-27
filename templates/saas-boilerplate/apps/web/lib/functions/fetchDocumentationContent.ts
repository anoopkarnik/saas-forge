import { getCmsProvider } from "@/lib/cms-provider";

/** A doc page's markdown, or null when the slug is not registered (constant) or stored (postgres). */
export async function fetchDocumentationContent(slug: string): Promise<string | null> {
    const cmsType = getCmsProvider();

    if (cmsType === "constant") {
        const { documentationData } = await import("@workspace/database/constants");
        const fs = await import("fs/promises");
        const path = await import("path");
        const docMeta = documentationData.find((d: any) => d.slug === slug);
        if (!docMeta) return null;

        // Resolve path to packages/database/src/docs
        const targetPath = path.join(process.cwd(), "../../packages/database/src/docs", docMeta.filePath);
        return await fs.readFile(targetPath, "utf-8");
    }

    if (cmsType === "postgres") {
        const prisma = (await import("@workspace/database/client")).default;
        const page = await prisma.documentation.findUnique({ where: { slug } });
        return page?.content ?? null;
    }

    throw new Error(`CMS "${cmsType}" is not supported`);
}
