import { NextRequest } from "next/server";
import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { executeMarketplaceCommand } from "@/server/marketplace/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await executeMarketplaceCommand(body);

    return jsonSuccess(result, {
      message: "Marketplace command completed successfully.",
    });
  } catch (error) {
    return jsonMongoError(error, "Unable to complete marketplace command.");
  }
}
