import { describe, expect, it } from "vitest";
import { parseUserInput } from "better-auth/db";
import { userAdditionalFields } from "./user-fields";

// Better Auth's own input parser, as sign-up and update-user call it.
const options = { user: { additionalFields: userAdditionalFields } } as Parameters<typeof parseUserInput>[0];

describe("userAdditionalFields", () => {
  it("refuses credit balances from sign-up and update-user bodies", () => {
    expect(() => parseUserInput(options, { creditsTotal: 1_000_000 }, "update")).toThrow(/not allowed/);
    expect(() => parseUserInput(options, { creditsUsed: 5 }, "create")).toThrow(/not allowed/);
  });

  it("drops a falsy credit value instead of writing it", () => {
    expect(parseUserInput(options, { creditsUsed: 0 }, "update")).not.toHaveProperty("creditsUsed");
  });
});
