import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { DocumentationProps } from "@/lib/ts-types/doc";
import { redis } from "@/server/redis";
import { createTRPCRouter, baseProcedure, adminProcedure } from "@/trpc/init";
import { retrieveBlocksTree } from "@workspace/cms/notion/block/retrieveBlockChildren";
import prisma from "@workspace/database/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const DOCUMENTATION_CACHE_TTL_SECONDS = 3600; // 10 minutes
const getDocumentationCacheKey = () =>
  `${(process.env.NEXT_PUBLIC_SAAS_NAME || "documentation").toLowerCase()}-documentation:v1`;

const documentationEditorSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  type: z.string().trim().min(1, "Type is required"),
  order: z.number().int().min(0, "Order must be 0 or greater"),
  content: z.string().min(1, "Content is required"),
});

const getCmsProvider = () => process.env.NEXT_PUBLIC_CMS || "notion";

const ensurePostgresDocumentationEditing = () => {
  if (getCmsProvider() !== "postgres") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Documentation editing is only available for postgres CMS right now.",
    });
  }
};

const getLandingPageOrThrow = async () => {
  const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";
  const landingPage = await prisma.landingPage.findUnique({
    where: { title: saasName },
  });

  if (!landingPage) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Landing Page config not found in Postgres for name: ${saasName}`,
    });
  }

  return landingPage;
};

const clearDocumentationCache = async () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await redis.del(getDocumentationCacheKey());
  }
};

export const documentationRouter = createTRPCRouter({
    getDocumentationInfoFromNotion: baseProcedure
    .query(async () => {
      const cmsProvider = process.env.NEXT_PUBLIC_CMS || "notion";

      if (
        !process.env.UPSTASH_REDIS_REST_URL || 
        !process.env.UPSTASH_REDIS_REST_TOKEN ||
        cmsProvider === "constant"
      ) {
        const data = await fetchDocumentation();
        return data;
      }

      const cached = await redis.get<DocumentationProps>(getDocumentationCacheKey());
      if (cached) {
        return cached;
      }

      const data = await fetchDocumentation();

      await redis.set(getDocumentationCacheKey(), data, { ex: DOCUMENTATION_CACHE_TTL_SECONDS });
      return data;

    }),
    queryDocumentationBySlug: baseProcedure
    .input(z.object({slug: z.string().min(1, "Slug is required")}))
    .query(async ({ input }) => {
      // We need to fetch the documentation list to find the ID corresponding to the slug
      
      const cmsProvider = process.env.NEXT_PUBLIC_CMS || "notion";
      
      let documentation: DocumentationProps | null = null;
      if (
        process.env.UPSTASH_REDIS_REST_URL && 
        process.env.UPSTASH_REDIS_REST_TOKEN &&
        cmsProvider !== "constant"
      ) {
         documentation = await redis.get<DocumentationProps>(getDocumentationCacheKey());
      }

      if (!documentation) {
         documentation = await fetchDocumentation();
         if (
           process.env.UPSTASH_REDIS_REST_URL && 
           process.env.UPSTASH_REDIS_REST_TOKEN &&
           cmsProvider !== "constant"
         ) {
            await redis.set(getDocumentationCacheKey(), documentation, { ex: DOCUMENTATION_CACHE_TTL_SECONDS });
         }
      }

      const doc = documentation.docs.find((d) => d.slug === input.slug);

      if (!doc) {
        throw new Error("Documentation not found");
      }

      if (process.env.NEXT_PUBLIC_CMS === "constant") {
        const { documentationData } = await import("@workspace/database/constants");
        const fs = await import("fs/promises");
        const path = await import("path");
        const docMeta = documentationData.find((d: any) => d.slug === input.slug);
        if (!docMeta) throw new Error("Documentation not found");
        
        // Resolve path to packages/database/src/docs
        const targetPath = path.join(process.cwd(), "../../packages/database/src/docs", docMeta.filePath);
        return await fs.readFile(targetPath, "utf-8");
      }

      if (process.env.NEXT_PUBLIC_CMS === "postgres") {
        const prisma = (await import("@workspace/database/client")).default;
        const page = await prisma.documentation.findUnique({ where: { slug: input.slug } });
        if (!page) throw new Error("Documentation not found in database");
        return page.content;
      }

      const blocks = await retrieveBlocksTree({
        apiToken: process.env.NOTION_API_TOKEN!,
        block_id: doc.id
      });

      return blocks;
    }),
    listAdminDocs: adminProcedure
    .query(async () => {
      ensurePostgresDocumentationEditing();

      const landingPage = await getLandingPageOrThrow();
      const docs = await prisma.documentation.findMany({
        where: { landingPageId: landingPage.id },
        orderBy: [
          { order: "asc" },
          { title: "asc" },
        ],
      });

      return docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        type: doc.type || "Guide",
        order: doc.order,
        content: doc.content,
        lastUpdated: doc.lastUpdated.toISOString(),
      }));
    }),
    getAdminDocById: adminProcedure
    .input(z.object({ id: z.string().min(1, "Document id is required") }))
    .query(async ({ input }) => {
      ensurePostgresDocumentationEditing();

      const landingPage = await getLandingPageOrThrow();
      const doc = await prisma.documentation.findFirst({
        where: {
          id: input.id,
          landingPageId: landingPage.id,
        },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documentation not found",
        });
      }

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        type: doc.type || "Guide",
        order: doc.order,
        content: doc.content,
        lastUpdated: doc.lastUpdated.toISOString(),
      };
    }),
    createDoc: adminProcedure
    .input(documentationEditorSchema)
    .mutation(async ({ input }) => {
      ensurePostgresDocumentationEditing();

      const landingPage = await getLandingPageOrThrow();
      const existingDoc = await prisma.documentation.findUnique({
        where: { slug: input.slug },
      });

      if (existingDoc) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A documentation page with slug "${input.slug}" already exists.`,
        });
      }

      const doc = await prisma.documentation.create({
        data: {
          landingPageId: landingPage.id,
          title: input.title,
          slug: input.slug,
          type: input.type,
          order: input.order,
          content: input.content,
          lastUpdated: new Date(),
        },
      });

      await clearDocumentationCache();

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        type: doc.type || "Guide",
        order: doc.order,
        content: doc.content,
        lastUpdated: doc.lastUpdated.toISOString(),
      };
    }),
    updateDoc: adminProcedure
    .input(z.object({
      id: z.string().min(1, "Document id is required"),
      title: documentationEditorSchema.shape.title,
      slug: documentationEditorSchema.shape.slug,
      type: documentationEditorSchema.shape.type,
      order: documentationEditorSchema.shape.order,
      content: documentationEditorSchema.shape.content,
    }))
    .mutation(async ({ input }) => {
      ensurePostgresDocumentationEditing();

      const landingPage = await getLandingPageOrThrow();
      const existingDoc = await prisma.documentation.findFirst({
        where: {
          id: input.id,
          landingPageId: landingPage.id,
        },
      });

      if (!existingDoc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documentation not found",
        });
      }

      const conflictingDoc = await prisma.documentation.findUnique({
        where: { slug: input.slug },
      });

      if (conflictingDoc && conflictingDoc.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A documentation page with slug "${input.slug}" already exists.`,
        });
      }

      const doc = await prisma.documentation.update({
        where: { id: input.id },
        data: {
          title: input.title,
          slug: input.slug,
          type: input.type,
          order: input.order,
          content: input.content,
          lastUpdated: new Date(),
        },
      });

      await clearDocumentationCache();

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        type: doc.type || "Guide",
        order: doc.order,
        content: doc.content,
        lastUpdated: doc.lastUpdated.toISOString(),
      };
    }),
    deleteDoc: adminProcedure
    .input(z.object({ id: z.string().min(1, "Document id is required") }))
    .mutation(async ({ input }) => {
      ensurePostgresDocumentationEditing();

      const landingPage = await getLandingPageOrThrow();
      const deleted = await prisma.documentation.deleteMany({
        where: {
          id: input.id,
          landingPageId: landingPage.id,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documentation not found",
        });
      }

      await clearDocumentationCache();

      return { success: true };
    }),
});
