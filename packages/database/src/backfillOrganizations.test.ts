import { describe, it, expect, vi } from "vitest";
import { backfillOrganizations } from "./backfillOrganizations";

function fakeDb(users: Array<{ id: string; name: string | null; email: string }>) {
  return {
    user: { findMany: vi.fn(async () => users) },
    organization: { create: vi.fn(async ({ data }: any) => ({ id: `org-${data.slug}` })) },
  };
}

describe("backfillOrganizations", () => {
  it("only selects users without any membership", async () => {
    const db = fakeDb([]);
    await backfillOrganizations(db as any);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { members: { none: {} } } }),
    );
  });

  it("creates an owned personal workspace per user and reports the count", async () => {
    const db = fakeDb([
      { id: "u1", name: "Alex", email: "alex@x.io" },
      { id: "u2", name: null, email: "bo@x.io" },
    ]);

    const created = await backfillOrganizations(db as any);

    expect(created).toBe(2);
    const calls = db.organization.create.mock.calls.map((c: any) => c[0].data);
    expect(calls[0].name).toBe("Alex's Workspace");
    expect(calls[0].slug).toMatch(/^alexs-workspace-[a-f0-9]{6}$/);
    expect(calls[0].members).toEqual({ create: { userId: "u1", role: "owner" } });
    expect(calls[1].name).toBe("bo's Workspace");
  });
});
