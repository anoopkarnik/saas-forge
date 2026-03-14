import { handlers } from "@workspace/auth/better-auth/auth"; // path to your auth file
import { NextRequest, NextResponse } from "next/server";

const { POST: authPOST, GET: authGET } = handlers;

const setCorsHeaders = (res: Response | NextResponse, req: NextRequest) => {
    const origin = req.headers.get("origin");
    if (origin && (origin === "http://localhost:5173" || origin === "myapp://" || origin === process.env.NEXT_PUBLIC_URL)) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Credentials", "true");
        res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return res;
};

export const POST = async (req: NextRequest) => {
    const response = await authPOST(req);
    return setCorsHeaders(response, req);
};

export const GET = async (req: NextRequest) => {
    const response = await authGET(req);
    return setCorsHeaders(response, req);
};

export const OPTIONS = async (req: NextRequest) => {
    return setCorsHeaders(new NextResponse(null, { status: 204 }), req);
};