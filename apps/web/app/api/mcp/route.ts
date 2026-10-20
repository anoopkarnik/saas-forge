import { NextRequest } from "next/server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { createAppMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";

// Stateless Streamable HTTP: each request gets a fresh server built for the
// caller the API key resolved to (passed through as authInfo).
const mcp = createMcpHandler(({ authInfo }) =>
  createAppMcpServer({
    userId: String(authInfo?.extra?.userId),
    scopes: authInfo?.scopes ?? [],
  }),
);

/** API-key auth (hashing, revocation, expiry, per-key rate limit); scopes are checked per tool. */
async function handle(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: [] });
  if (!auth.ok) return auth.response;

  return mcp.fetch(req, {
    authInfo: {
      token: auth.keyId,
      clientId: auth.keyId,
      scopes: auth.scopes,
      extra: { userId: auth.userId },
    },
  });
}

export { handle as GET, handle as POST, handle as DELETE };
