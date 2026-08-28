import { NextRequest, NextResponse } from "next/server";
import db from "@workspace/database/client";
import { authenticateApiKey } from "@/server/authenticateApiKey";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:credits"] });
  if (!auth.ok) return auth.response;

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { creditsTotal: true, creditsUsed: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: "user_not_found", message: "User no longer exists." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    credits: {
      total: user.creditsTotal,
      used: user.creditsUsed,
      remaining: user.creditsTotal - user.creditsUsed,
    },
  });
}
