import { track } from "@workspace/analytics/server";

type HookContext = { path?: string; headers?: Headers } | null;

/** "email", or the OAuth provider for social callbacks ("/callback/github" -> "github"). */
export function authMethod(path: string | undefined): string {
  const provider = path?.match(/\/callback\/([^/?]+)/)?.[1];
  if (provider) return provider;
  return path?.includes("email") ? "email" : "other";
}

export async function trackSignedUp(userId: string, ctx: HookContext) {
  await track("auth.signed_up", { method: authMethod(ctx?.path) }, { distinctId: userId, headers: ctx?.headers });
}

export async function trackSignedIn(userId: string, ctx: HookContext) {
  // Impersonation sessions are an admin acting, not the user signing in.
  if (ctx?.path?.startsWith("/admin/")) return;
  await track("auth.signed_in", { method: authMethod(ctx?.path) }, { distinctId: userId, headers: ctx?.headers });
}
