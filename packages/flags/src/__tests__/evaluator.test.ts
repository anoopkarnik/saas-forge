import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlagState } from "../rules";
import type { FlagCache } from "../evaluator";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@workspace/database/client", () => ({
  default: { featureFlag: { findMany } },
}));
vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { warn: vi.fn() },
}));

import { createFlagEvaluator } from "../evaluator";

const definitions = {
  search: { description: "New search", default: false },
  help: { description: "Help center", default: true },
};
const stored = (enabled: boolean) => [{ key: "search", enabled, rules: [] }];

beforeEach(() => vi.resetAllMocks());

describe("flag evaluator host boundary", () => {
  it("evaluates only the host registry and uses its defaults for unstored flags", async () => {
    findMany.mockResolvedValue([
      { key: "unregistered", enabled: true, rules: [] },
    ]);
    const evaluator = createFlagEvaluator(definitions);
    expect(await evaluator.evaluateFlags()).toEqual({
      search: false,
      help: true,
    });
  });

  it("keeps independent evaluators' memory caches separate", async () => {
    findMany.mockResolvedValue(stored(true));
    const first = createFlagEvaluator(definitions);
    expect(await first.isEnabled("search")).toBe(true);

    findMany.mockResolvedValue(stored(false));
    const second = createFlagEvaluator(definitions);
    expect(await second.isEnabled("search")).toBe(false);
    expect(await first.isEnabled("search")).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it("clears its memory cache so the next read sees the saved value", async () => {
    findMany.mockResolvedValue(stored(false));
    const evaluator = createFlagEvaluator(definitions);
    expect(await evaluator.isEnabled("search")).toBe(false);

    findMany.mockResolvedValue(stored(true));
    expect(await evaluator.isEnabled("search")).toBe(false);
    await evaluator.invalidateFlagCache();
    expect(await evaluator.isEnabled("search")).toBe(true);
  });

  it("uses the supplied shared cache and clears it before the next database read", async () => {
    let states: Record<string, FlagState> | null = {
      search: { enabled: true, rules: [] },
    };
    const external: FlagCache = {
      read: vi.fn(async () => states),
      write: vi.fn(async (next) => {
        states = next;
      }),
      clear: vi.fn(async () => {
        states = null;
      }),
    };
    const evaluator = createFlagEvaluator(definitions, external);
    expect(await evaluator.isEnabled("search")).toBe(true);
    expect(findMany).not.toHaveBeenCalled();

    findMany.mockResolvedValue(stored(false));
    await evaluator.invalidateFlagCache();
    expect(external.clear).toHaveBeenCalledOnce();
    expect(await evaluator.isEnabled("search")).toBe(false);
    expect(states).toEqual({ search: { enabled: false, rules: [] } });
  });

  it("falls back to database state when the supplied cache is unavailable", async () => {
    const external: FlagCache = {
      read: vi.fn(async () => {
        throw new Error("cache unavailable");
      }),
      write: vi.fn(async () => {
        throw new Error("cache unavailable");
      }),
      clear: vi.fn(async () => undefined),
    };
    findMany.mockResolvedValue(stored(true));
    expect(
      await createFlagEvaluator(definitions, external).isEnabled("search"),
    ).toBe(true);
  });

  it("ignores corrupt stored rules while preserving the stored enabled value", async () => {
    findMany.mockResolvedValue([
      {
        key: "search",
        enabled: true,
        rules: [{ type: "removed-rule", value: false }],
      },
    ]);
    expect(
      await createFlagEvaluator(definitions).isEnabled("search", {
        userId: "u1",
      }),
    ).toBe(true);
  });
});
