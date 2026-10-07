import { NextResponse, type NextRequest } from "next/server";
import {
  authSessionCookieName,
  secureAuthSessionCookieName,
} from "@workspace/auth/better-auth/cookies";
import { DESKTOP_APP_ORIGIN } from "@workspace/auth/better-auth/desktop-origin";
import { resolveRoutePolicy } from "@/lib/route-policy";
// scaffold:begin feature_flags
import { ANONYMOUS_ID_COOKIE } from "@/lib/flags/definitions";
// scaffold:end feature_flags

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  DESKTOP_APP_ORIGIN,
  process.env.NEXT_PUBLIC_URL,
].filter(Boolean) as string[];

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Origin can be "null" or malformed; that must never throw (500) or match.
function isSameHost(origin: string, host: string) {
  try {
    return !!origin && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const pathName = req.nextUrl.pathname;
  // Route access rules live in lib/route-policy.ts; unlisted paths are
  // protected pages.
  const policy = resolveRoutePolicy(pathName);
  const routeAuth = policy?.auth ?? "session";
  const handlerManagesCors = policy?.cors === "self-managed";
  const isAllowedOrigin =
    isSameHost(origin, req.nextUrl.host) || allowedOrigins.includes(origin);

  // Handle preflighted requests
  const isPreflight = req.method === "OPTIONS";

  if (isPreflight) {
    if (handlerManagesCors) {
      return NextResponse.next();
    }
    const preflightHeaders = {
      ...(isAllowedOrigin && {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      }),
      ...corsOptions,
    };
    return NextResponse.json({}, { headers: preflightHeaders });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (policy?.maxBodyBytes && contentLength > policy.maxBodyBytes) {
    return NextResponse.json(
      { error: "Payload too large" },
      {
        status: 413,
        headers: isAllowedOrigin
          ? {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Credentials": "true",
            }
          : undefined,
      },
    );
  }

  const response = NextResponse.next();

  // scaffold:begin feature_flags
  // A stable id so percentage rollouts treat a visitor the same before sign-in.
  if (!req.cookies.get(ANONYMOUS_ID_COOKIE)) {
    response.cookies.set(ANONYMOUS_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  // scaffold:end feature_flags

  // Set CORS headers on all responses for allowed origins
  if (!handlerManagesCors && isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (!handlerManagesCors) {
    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Cookie gating is for pages only. Session API routes answer 401 JSON
  // themselves via guardRoute (routePolicy.test.ts enforces this), and the
  // rest — Better Auth itself, tRPC, API keys, webhooks — authenticate in
  // their handlers. Skipping /api/auth here also avoids infinite recursion.
  const isPage = !pathName.startsWith("/api/");
  if (!isPage || (routeAuth !== "session" && routeAuth !== "auth-page")) {
    return response;
  }

  // Check for both the local and Secure (production HTTPS) cookie prefixes.
  // Better Auth uses __Secure- prefix in production.
  const sessionToken =
    req.cookies.get(authSessionCookieName)?.value ||
    req.cookies.get(secureAuthSessionCookieName)?.value;
  const isLoggedIn = !!sessionToken;

  if (routeAuth === "auth-page") {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return response;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/landing", req.nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
