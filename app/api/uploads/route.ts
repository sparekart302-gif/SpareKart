import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { saveUploadedImage } from "@/server/uploads/service";
import type { UploadAssetKind } from "@/modules/uploads/shared";

export const runtime = "nodejs";

const allowedKinds = new Set<UploadAssetKind>([
  "product",
  "store-logo",
  "store-banner",
  "review",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "").trim() as UploadAssetKind;
    const ownerHint = String(formData.get("ownerHint") ?? "").trim() || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Select an image file to upload.",
        },
        { status: 400 },
      );
    }

    if (!allowedKinds.has(kind)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported upload type.",
        },
        { status: 400 },
      );
    }

    const item = await saveUploadedImage({
      file,
      kind,
      ownerHint,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return jsonMongoError(error, "Unable to upload image.");
  }
}

