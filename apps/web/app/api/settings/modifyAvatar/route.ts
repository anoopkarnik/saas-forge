import { NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import { ratelimit } from "@/server/ratelimit";
import {
  normalizeImageUpload,
  uploadNormalizedImage,
} from "@/server/uploads/image-upload";

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

  try {
    const normalizedImage = await normalizeImageUpload({
      file,
      maxSizeBytes: 5 * 1024 * 1024,
    });

    const url = await uploadNormalizedImage({
      ...normalizedImage,
      keyPrefix: "profile-images",
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
