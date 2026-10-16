import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/server/authenticateApiKey";
import { getPublicPricing } from "@/lib/scaffold/public-pricing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:me"] });
  if (!auth.ok) return auth.response;

  return NextResponse.json(getPublicPricing());
}
