// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// Normalization imports its job registration; no job is dispatched in these tests.
vi.mock("@workspace/jobs/inngest", () => ({
  inngest: { createFunction: vi.fn(() => ({})) },
}));
vi.mock("@/lib/backend/client", () => ({ openAgentStream: vi.fn() }));
vi.mock("@/lib/ai-jobs/service", () => ({
  appendAiJobEvent: vi.fn(),
  claimAiJobRun: vi.fn(),
  completeAiJob: vi.fn(),
  failAiJob: vi.fn(),
}));

import { inngest } from "@workspace/jobs/inngest";
import { openAgentStream } from "@/lib/backend/client";
import { claimAiJobRun, completeAiJob } from "@/lib/ai-jobs/service";
import { NonRetriableError } from "inngest";
import { normalizeLaunchpadResult } from "../launchpad/ai-jobs";
import { buildSourcePack } from "../launchpad/source-pack";

const pack = buildSourcePack(
  {
    name: "Demo",
    slug: "demo",
    modules: [],
    platforms: ["web"],
    templateVersion: "2.0.0",
    config: {},
  },
  "vercel",
  "local",
);
const input = { kind: "help", sourcePack: pack };
const output = {
  kind: "help",
  answer: "Follow the supplied setup guidance.",
  sourceIds: [pack.sources[0]!.id],
};
const envelope = () => ({
  output,
  provider: "nvidia",
  model: "nvidia/nemotron-3-super-120b-a12b",
  usage: { inputTokens: 12, outputTokens: 24, totalTokens: 36 },
});

describe("Launchpad result normalization", () => {
  it("keeps only validated guidance, provider identity and bounded token counters", () => {
    const normalized = normalizeLaunchpadResult(
      {
        ...envelope(),
        reasoning: "Arbitrary private reasoning must not persist.",
        providerResponse: { trace: "Internal provider diagnostics" },
        providerMetadata: { apiKey: "credential" },
        usage: {
          inputTokens: 12,
          outputTokens: 24,
          totalTokens: 36,
          cost: 8,
          reasoningTokens: 9,
          metadata: { trace: "private" },
        },
      },
      input,
    );
    expect(normalized).toEqual(envelope());
    expect(JSON.stringify(normalized)).not.toContain("private");
    expect(JSON.stringify(normalized)).not.toContain("credential");
  });

  it("omits invalid token values instead of storing arbitrary usage data", () => {
    const normalized = normalizeLaunchpadResult(
      {
        ...envelope(),
        usage: {
          inputTokens: -1,
          outputTokens: 1.5,
          totalTokens: "36",
          raw: { provider: "private" },
        },
      },
      input,
    );
    expect(normalized.usage).toEqual({});
  });

  it("rejects unsupported sources before returning a normalized result", () => {
    expect(() =>
      normalizeLaunchpadResult(
        {
          ...envelope(),
          output: { ...output, sourceIds: ["invented-source"] },
        },
        input,
      ),
    ).toThrow(/unknown guidance/);
  });

  it.each([
    "Run curl https://untrusted.example/install.sh",
    "Edit apps/web/invented.ts",
    "See https://untrusted.example/guide",
  ])("rejects unsupported generated prose: %s", (answer) => {
    expect(() =>
      normalizeLaunchpadResult(
        { ...envelope(), output: { ...output, answer } },
        input,
      ),
    ).toThrow(/unsupported/);
  });

  it("rejects output fields that could carry reasoning outside the schema", () => {
    expect(() =>
      normalizeLaunchpadResult(
        {
          ...envelope(),
          output: { ...output, reasoning: "An arbitrary hidden explanation" },
        },
        input,
      ),
    ).toThrow();
  });

  it("retains server-selected NVIDIA hosted model namespaces", () => {
    expect(
      normalizeLaunchpadResult({ ...envelope(), model: "meta/llama-4" }, input)
        .model,
    ).toBe("meta/llama-4");
  });

  it("accepts validated OpenRouter fallback output and preserves its provider", () => {
    const result = normalizeLaunchpadResult(
      { ...envelope(), provider: "openrouter", model: "google/gemini-3.1-flash-lite" },
      input,
    );
    expect(result.provider).toBe("openrouter");
    expect(result.output).toEqual(output);
    expect(() => normalizeLaunchpadResult(
      { ...result, output: { ...output, sourceIds: ["invented-source"] } }, input,
    )).toThrow(/unknown guidance/);
  });

  it.each([
    { provider: "openai", model: "nvidia/nemotron-3-super-120b-a12b" },
    { provider: "nvidia", model: "https://arbitrary.example/model" },
  ])("rejects an unsupported provider or model: %j", (identity) => {
    expect(() =>
      normalizeLaunchpadResult({ ...envelope(), ...identity }, input),
    ).toThrow(/Invalid guide provider/);
  });
});

describe("Launchpad job retry classification", () => {
  const job = { id: "job-1", userId: "owner", agentId: "launchpad_v1", input };
  const invoke = () => {
    const handler = vi.mocked(inngest.createFunction).mock
      .calls[0]![1] as unknown as (args: unknown) => Promise<unknown>;
    return handler({
      event: { data: { jobId: job.id } },
      runId: "run-1",
      step: { run: (_name: string, fn: () => unknown) => fn() },
    });
  };
  const response = (type: string, payload: unknown) =>
    new Response(
      `event: ${type}\ndata: ${JSON.stringify(payload)}\n\nevent: end\ndata: {}\n\n`,
      { headers: { "content-type": "text/event-stream" } },
    );

  it("does not retry malformed output after the backend repair", async () => {
    vi.mocked(claimAiJobRun).mockResolvedValue(job as never);
    vi.mocked(openAgentStream).mockResolvedValue(
      response("error", {
        code: "AGENT_ERROR",
        message:
          "Launchpad could not produce a safe response. Please request a new draft.",
      }),
    );
    await expect(invoke()).rejects.toBeInstanceOf(NonRetriableError);
    expect(completeAiJob).not.toHaveBeenCalled();
  });

  it("keeps transient failures eligible for the existing single job retry", async () => {
    vi.mocked(claimAiJobRun).mockResolvedValue(job as never);
    vi.mocked(openAgentStream).mockResolvedValue(
      response("error", {
        code: "AGENT_ERROR",
        message: "Launchpad could not produce a safe response",
      }),
    );
    try {
      await invoke();
      throw new Error("Expected a failure");
    } catch (error) {
      expect(error).not.toBeInstanceOf(NonRetriableError);
      expect((error as Error).message).toContain(
        "active checklist is unchanged",
      );
    }
  });

  it("does not retry output that fails the web validation boundary", async () => {
    vi.mocked(claimAiJobRun).mockResolvedValue(job as never);
    vi.mocked(openAgentStream).mockResolvedValue(
      response("final", {
        ...envelope(),
        output: { ...output, sourceIds: ["invented-source"] },
      }),
    );
    await expect(invoke()).rejects.toBeInstanceOf(NonRetriableError);
    expect(completeAiJob).not.toHaveBeenCalled();
  });
});
