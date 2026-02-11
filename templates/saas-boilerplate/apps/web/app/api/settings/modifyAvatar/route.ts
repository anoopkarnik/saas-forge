import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import { ratelimit } from "@/server/ratelimit";

export const runtime = "nodejs"; // important

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await ratelimit.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // File type validation
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
  }

  // File size validation (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size exceeds 5MB limit." }, { status: 400 });
  }

  const filename = file.name || `avatar_${Date.now()}.png`;

  const blob = await put(filename, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true
  });

  return NextResponse.json(blob);
}
