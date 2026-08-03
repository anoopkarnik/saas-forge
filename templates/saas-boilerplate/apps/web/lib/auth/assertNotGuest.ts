import { NextResponse } from "next/server";

type SessionLike = { user?: { role?: string | null } | null } | null;

export function assertNotGuest(session: SessionLike): NextResponse | null {
  if (session?.user?.role === "guest") {
    return NextResponse.json(
      { error: "This is a read-only demo account." },
      { status: 403 },
    );
  }
  return null;
}
