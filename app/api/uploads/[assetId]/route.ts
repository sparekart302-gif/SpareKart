import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { getUploadedImage } from "@/server/uploads/service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await context.params;
    const asset = await getUploadedImage(assetId);

    return new NextResponse(new Uint8Array(asset.buffer), {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(asset.size),
        "Content-Disposition": `inline; filename="${asset.fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return jsonMongoError(error, "Unable to load image.");
  }
}
