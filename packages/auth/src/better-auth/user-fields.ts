import type { BetterAuthOptions } from "better-auth";

type AdditionalUserFields = NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

/**
 * Extra user columns Better Auth reads and returns in the session. Only
 * fields with `input: true` may come from sign-up or update-user bodies;
 * credit balances change through Prisma on the server only.
 */
export const userAdditionalFields = {
  creditsUsed: { type: "number", required: false, input: false },
  creditsTotal: { type: "number", required: false, input: false },
} satisfies AdditionalUserFields;
