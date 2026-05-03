import { NextResponse, type NextRequest } from "next/server";
import { requireSellerOrAdminSessionUser } from "@/server/auth/service";
import { jsonFailure, jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { saveUploadedImage } from "@/server/uploads/service";
import type { UploadAssetKind } from "@/modules/uploads/shared";

export const runtime = "nodejs";

const allowedKinds = new Set<UploadAssetKind>([
  "product",
  "store-logo",
  "store-banner",
  "review",
  "payment-proof",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "").trim() as UploadAssetKind;
    const ownerHint = String(formData.get("ownerHint") ?? "").trim() || undefined;

    if (!(file instanceof File)) {
      return jsonFailure("Select an image file to upload.", {
        status: 400,
      });
    }

    if (!allowedKinds.has(kind)) {
      return jsonFailure("Unsupported upload type.", {
        status: 400,
      });
    }

    if (kind !== "review" && kind !== "payment-proof") {
      await requireSellerOrAdminSessionUser();
    }

    const item = await saveUploadedImage({
      file,
      kind,
      ownerHint,
    });

    return jsonSuccess(
      { item },
      {
        status: 201,
        message: "Image uploaded successfully.",
        extra: {
          item,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to upload image.");
  }
}
