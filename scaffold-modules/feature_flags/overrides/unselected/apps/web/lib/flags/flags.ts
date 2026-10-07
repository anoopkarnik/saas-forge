import { FLAGS, flagDefaults, type FlagKey, type FlagSubject, type FlagValues } from "@/lib/flags/definitions";

/**
 * Without the feature_flags module every flag keeps its default (see
 * ./definitions). Same exports as the module's evaluator, so callers need no
 * changes.
 */

export const isEnabled: (key: FlagKey, subject?: FlagSubject) => Promise<boolean> = async (key) => FLAGS[key].default;

export const evaluateFlags: (subject?: FlagSubject) => Promise<FlagValues> = async () => flagDefaults();

export const evaluateFlagsForRequest = async (): Promise<FlagValues> => flagDefaults();

export const sessionSubject: (session: unknown, anonymousId?: string | null) => Promise<FlagSubject> = async () => ({});

export const requireFlag: (key: FlagKey, req: Request) => Promise<Response | null> = async (key) =>
  FLAGS[key].default ? null : Response.json({ error: "Not found" }, { status: 404 });
