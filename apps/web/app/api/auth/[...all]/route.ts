import { handlers } from "@workspace/auth/better-auth/auth"; // path to your auth file
import { DESKTOP_APP_ORIGIN } from "@workspace/auth/better-auth/desktop-origin";
import { NextRequest, NextResponse } from "next/server";

const { POST: authPOST, GET: authGET } = handlers;

const allowedOrigins = [
  DESKTOP_APP_ORIGIN,
  "http://localhost:5173",
  "http://localhost:8081",
  "saas-forge://",
  "exp://",
  process.env.NEXT_PUBLIC_URL,
].filter(Boolean) as string[];

/**
 * Non-browser clients send no Origin, which Better Auth rejects internally.
 * Rewrite a missing origin to our own so Better Auth accepts them. "null" is
 * deliberately NOT rewritten: sandboxed iframes on any site send it, and our
 * cookies are SameSite=None, so trusting it would allow cross-site requests.
 * The desktop app sends DESKTOP_APP_ORIGIN instead.
 */
const normalizeMissingOrigin = (req: NextRequest): NextRequest => {
  const origin = req.headers.get("origin");
  if (!origin) {
    const headers = new Headers(req.headers);
    headers.set(
      "origin",
      process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    );
    return new NextRequest(req.url, {
      method: req.method,
      headers,
      body: req.body,
      // @ts-ignore - duplex is needed for streaming body
      duplex: "half",
    });
  }
  return req;
};

const setCorsHeaders = (res: Response | NextResponse, req: NextRequest) => {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }
  return res;
};

export const POST = async (req: NextRequest) => {
  return setCorsHeaders(await authPOST(normalizeMissingOrigin(req)), req);
};

export const GET = async (req: NextRequest) => {
  return setCorsHeaders(await authGET(normalizeMissingOrigin(req)), req);
};

export const OPTIONS = async (req: NextRequest) => {
  return setCorsHeaders(new NextResponse(null, { status: 204 }), req);
};
