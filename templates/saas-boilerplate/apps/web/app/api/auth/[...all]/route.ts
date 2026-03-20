import { handlers } from "@workspace/auth/better-auth/auth"; // path to your auth file
import { NextRequest, NextResponse } from "next/server";

const { POST: authPOST, GET: authGET } = handlers;

const desktopOrigins = ["null", "file://", ""];
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8081",
    "myapp://",
    "exp://",
    "null",
    "file://",
    process.env.NEXT_PUBLIC_URL,
].filter(Boolean) as string[];

/**
 * Electron desktop app (file:// protocol) sends Origin: null or no origin.
 * Better Auth rejects requests with missing/null origins internally.
 * Rewrite these to a trusted origin so Better Auth accepts them.
 */
const normalizeDesktopOrigin = (req: NextRequest): NextRequest => {
    const origin = req.headers.get("origin");
    if (!origin || desktopOrigins.includes(origin)) {
        const headers = new Headers(req.headers);
        headers.set("origin", process.env.NEXT_PUBLIC_URL || "http://localhost:3000");
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
        res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return res;
};

export const POST = async (req: NextRequest) => {
    const originalOrigin = req.headers.get("origin");
    const normalizedReq = normalizeDesktopOrigin(req);
    const response = await authPOST(normalizedReq);
    // Restore original origin for CORS headers
    if (originalOrigin && desktopOrigins.includes(originalOrigin)) {
        response.headers.set("Access-Control-Allow-Origin", originalOrigin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return setCorsHeaders(response, req);
};

export const GET = async (req: NextRequest) => {
    const originalOrigin = req.headers.get("origin");
    const normalizedReq = normalizeDesktopOrigin(req);
    const response = await authGET(normalizedReq);
    if (originalOrigin && desktopOrigins.includes(originalOrigin)) {
        response.headers.set("Access-Control-Allow-Origin", originalOrigin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return setCorsHeaders(response, req);
};

export const OPTIONS = async (req: NextRequest) => {
    return setCorsHeaders(new NextResponse(null, { status: 204 }), req);
};