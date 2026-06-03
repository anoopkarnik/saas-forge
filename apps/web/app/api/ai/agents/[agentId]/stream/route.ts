import { NextRequest, NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import { openAgentStream } from "@/lib/backend/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ agentId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { agentId } = await ctx.params;
  let input: Record<string, unknown> = {};
  try {
    input = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const upstream = await openAgentStream({
    userId: session.user.id,
    orgId: null,
    agentId,
    input,
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "backend_error", status: upstream.status },
      { status: 502 },
    );
  }

  // Re-stream SSE through to the client without buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
