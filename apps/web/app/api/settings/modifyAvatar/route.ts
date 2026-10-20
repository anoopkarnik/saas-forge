import { NextResponse } from "next/server";
import { guardRoute } from "@/server/routeGuard";
import {
  normalizeImageUpload,
  uploadNormalizedImage,
} from "@/server/uploads/image-upload";

export const runtime = "nodejs"; // important

export async function POST(req: Request) {
  const guard = await guardRoute(req, "/api/settings/modifyAvatar");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
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
