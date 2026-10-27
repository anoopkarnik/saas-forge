import { z } from "zod";

export const FEATURE_ICONS = [
  "mail", "log-in", "database", "hard-drive", "file-text", "monitor-smartphone",
  "credit-card", "chart-no-axes-combined", "users", "list-checks", "bell",
  "sparkles", "bot", "clock", "plug", "key-round", "webhook", "flag",
  "scroll-text", "chart-column", "settings", "languages", "rocket", "refresh-cw", "layers",
] as const;

const keySchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");
export const cmsLinkSchema = z.string().max(2048).refine((value) => {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return !/[\\\s]/.test(value);
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Use a site-relative path or an HTTP(S) URL.");

export const featureGroupSchema = z.object({ key: keySchema, label: z.string().trim().min(1).max(80) });
export const featureGroupsSchema = z.array(featureGroupSchema).max(40).refine(
  (groups) => new Set(groups.map((group) => group.key)).size === groups.length,
  "Group keys must be unique.",
);
export const featureToolSchema = z.object({
  name: z.string().trim().min(1).max(100),
  logoUrl: cmsLinkSchema.default(""),
  url: cmsLinkSchema.optional(),
});
export const featureToolGroupSchema = z.object({
  label: z.string().trim().min(1).max(100),
  relationship: z.enum(["built-with", "choose-one", "sign-in", "compatible"]),
  tools: z.array(featureToolSchema).max(20),
});
export const featureDetailsSchema = z.object({
  key: keySchema,
  groupKey: keySchema,
  icon: z.enum(FEATURE_ICONS),
  inclusion: z.enum(["included", "optional", "platform"]),
  bullets: z.array(z.string().trim().min(1).max(500)).max(12),
  toolGroups: z.array(featureToolGroupSchema).max(8),
  dependencies: z.array(z.string().trim().min(1).max(100)).max(12),
  documentationUrl: cmsLinkSchema.optional(),
});
export const cmsFeatureSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000),
  category: z.string().max(100).optional(),
  imageUrl: z.string().default(""),
  details: featureDetailsSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export const cmsFeaturesSchema = z.array(cmsFeatureSchema).max(100).superRefine((features, ctx) => {
  const keys = new Set<string>();
  const ids = new Set<string>();
  features.forEach((feature, index) => {
    if (feature.id && ids.has(feature.id)) ctx.addIssue({ code: "custom", message: "Feature IDs must be unique.", path: [index, "id"] });
    if (feature.id) ids.add(feature.id);
    if (!feature.details) return;
    if (keys.has(feature.details.key)) ctx.addIssue({ code: "custom", message: "Feature keys must be unique.", path: [index, "details", "key"] });
    keys.add(feature.details.key);
  });
});
export type FeatureGroup = z.infer<typeof featureGroupSchema>;
export type FeatureDetails = z.infer<typeof featureDetailsSchema>;
export type FeatureToolGroup = z.infer<typeof featureToolGroupSchema>;
export type CmsFeature = z.infer<typeof cmsFeatureSchema>;

export function readFeatureDetails(value: unknown): FeatureDetails | null {
  const parsed = featureDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function readFeatureGroups(value: unknown): FeatureGroup[] {
  const parsed = featureGroupsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
