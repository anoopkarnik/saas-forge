// @vitest-environment node
import { describe, expect, it } from "vitest";
import { consumeAgentStream } from "../stream";

function response(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200 });
}

describe("agent event stream", () => {
  it("preserves events across network chunk boundaries and returns the final payload", async () => {
    const seen: Array<[string, number]> = [];
    const result = await consumeAgentStream(
      response(["event: step\ndata: {\"node\":\"start\"}\n\nevent: fi", "nal\ndata: {\"output\":{\"ok\":true}}\n\n"]),
      async (type, _payload, seq) => { seen.push([type, seq]); },
    );
    expect(seen).toEqual([["step", 0], ["final", 1]]);
    expect(result).toEqual({ output: { ok: true } });
  });

  it("rejects a stream that closes without a final event", async () => {
    await expect(consumeAgentStream(response(["event: end\ndata: {}\n\n"]), async () => {}))
      .rejects.toThrow("final");
  });

  it("accepts CRLF boundaries split between transport chunks", async () => {
    const result = await consumeAgentStream(
      response(["event: final\r", "\ndata: {\"output\":{}}\r", "\n\r", "\n"]),
      async () => {},
    );
    expect(result).toEqual({ output: {} });
  });

  it("rejects an error event even if the HTTP status is 200", async () => {
    await expect(consumeAgentStream(response(["event: error\ndata: {\"message\":\"agent failed\"}\n\n"]), async () => {}))
      .rejects.toThrow("agent failed");
  });
});
