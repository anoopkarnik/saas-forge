import { NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";

// Public one-click "Try demo" login. This route only SIGNS IN — it never
// creates or promotes an account. Sign-up defaults new accounts to the
// writable "user" role, which would be a security footgun for a public
// button. The demo guest account must be provisioned once by an admin via
// the existing "Create Guest" dialog, using these same
// DEMO_GUEST_EMAIL / DEMO_GUEST_PASSWORD credentials.
export async function POST(req: Request) {
  const email = process.env.DEMO_GUEST_EMAIL;
  const password = process.env.DEMO_GUEST_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          "Demo login is not configured. An admin must create the demo guest account (Admin > Users > Create Guest) with DEMO_GUEST_EMAIL/DEMO_GUEST_PASSWORD, then set those env vars.",
      },
      { status: 503 },
    );
  }

  let result: any;
  try {
    result = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
      headers: req.headers,
    });
  } catch {
    // signInEmail throws (APIError) for an unverified, banned, or otherwise
    // unusable demo account, or stale/rotated credentials. Return a graceful
    // error in the same style as the 503/403 branches rather than a 500.
    return NextResponse.json(
      { error: "Demo login failed. The demo guest account may be unavailable or its credentials are stale." },
      { status: 502 },
    );
  }

  // Mandatory safety guard: never hand a visitor a session unless the
  // signed-in account is actually the read-only guest role. If the env
  // credentials were ever mis-pointed at a writable account, refuse rather
  // than leak a writable session through the public demo button.
  const role = (result as any)?.response?.user?.role;
  if (role !== "guest") {
    return NextResponse.json(
      { error: "Demo login is misconfigured: the configured account is not a guest account." },
      { status: 403 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/", appUrl), 303);
  // better-auth emits MULTIPLE Set-Cookie headers on sign-in (session token +
  // session-data cache, since session.cookieCache is enabled). Forward each
  // one as its own header line — never collapse them with .get()/.set(),
  // which comma-joins into a single malformed Set-Cookie.
  const cookies: string[] = result?.headers?.getSetCookie?.() ?? [];
  for (const cookie of cookies) res.headers.append("set-cookie", cookie);
  return res;
}
