export type AgentEvent = { type: string; payload: Record<string, unknown> };

/** Read the backend's SSE response while preserving progress event boundaries. */
export async function consumeAgentStream(
  response: Response,
  onEvent: (type: string, payload: Record<string, unknown>, seq: number) => Promise<void>,
): Promise<Record<string, unknown>> {
  if (!response.ok || !response.body) throw new Error(`AI backend returned ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: Record<string, unknown> | null = null;
  let seq = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = (buffer + decoder.decode(value, { stream: true })).replaceAll("\r\n", "\n");
      for (;;) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary < 0) break;
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const type = frame.match(/^event: (.+)$/m)?.[1];
        const data = frame.match(/^data: (.+)$/m)?.[1];
        if (!type || !data) continue;
        const payload = JSON.parse(data) as Record<string, unknown>;
        if (type === "error") throw new Error(String(payload.message ?? "AI agent failed"));
        if (type === "end") continue;
        await onEvent(type, payload, seq++);
        if (type === "final") final = payload;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (!final) throw new Error("AI stream ended without a final event");
  return final;
}
