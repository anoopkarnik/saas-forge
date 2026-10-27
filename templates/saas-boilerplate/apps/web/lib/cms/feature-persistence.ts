import { Prisma } from "@workspace/database/prisma";
import { cmsFeaturesSchema, type CmsFeature } from "@workspace/ui/lib/feature-content";

/** Runs inside the caller's transaction. Submitted array order is authoritative. */
export async function saveLandingFeatures(tx: Prisma.TransactionClient, landingPageId: string, features: CmsFeature[]) {
  const existing = await tx.feature.findMany({ where: { landingPageId } });
  const byId = new Map(existing.map((feature) => [feature.id, feature]));
  const merged = features.map((feature) => {
    const previous = feature.id ? byId.get(feature.id) : undefined;
    if (feature.id && !previous) throw new Error("Feature ID does not belong to this landing page.");
    return {
      ...feature,
      category: feature.category ?? previous?.category ?? undefined,
      details: feature.details === undefined ? previous?.details ?? null : feature.details,
    };
  });
  const validated = cmsFeaturesSchema.parse(merged);
  // Validate the whole replacement before performing any writes.
  await tx.feature.deleteMany({ where: { landingPageId, id: { notIn: validated.flatMap((feature) => feature.id ? [feature.id] : []) } } });
  for (const [sortOrder, feature] of validated.entries()) {
    const data = {
      title: feature.title,
      description: feature.description,
      imageUrl: feature.imageUrl,
      category: feature.category,
      details: feature.details ?? Prisma.DbNull,
      sortOrder,
    };
    if (feature.id) await tx.feature.update({ where: { id: feature.id }, data });
    else await tx.feature.create({ data: { ...data, landingPageId } });
  }
}
