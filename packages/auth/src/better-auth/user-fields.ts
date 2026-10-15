import type { BetterAuthOptions } from "better-auth";
import { z } from "zod";
import { LOCALES } from "@workspace/i18n/config";

type AdditionalUserFields = NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

/**
 * Extra user columns Better Auth reads and returns in the session. Only
 * fields with `input: true` may come from sign-up or update-user bodies;
 * credit balances change through Prisma on the server only.
 */
export const userAdditionalFields = {
  creditsUsed: { type: "number", required: false, input: false },
  creditsTotal: { type: "number", required: false, input: false },
  // The user's language. Written through updateUser so Better Auth also
  // refreshes the cached session cookie.
  locale: { type: "string", required: false, input: true, validator: { input: z.enum(LOCALES).nullable() } },
} satisfies AdditionalUserFields;
