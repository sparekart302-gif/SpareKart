import { NextRequest } from "next/server";
import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { appendServerTiming, measureAsync } from "@/server/performance";
import { executeMarketplaceCommand } from "@/server/marketplace/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { durationMs, result } = await measureAsync(
      "marketplace.command",
      () => executeMarketplaceCommand(body),
      {
        details: {
          route: "/api/marketplace/command",
          command: typeof body?.command === "string" ? body.command : "unknown",
        },
      },
    );

    const response = jsonSuccess(result, {
      message: "Marketplace command completed successfully.",
    });

    return appendServerTiming(response, [
      {
        name: "app",
        durationMs,
        description: "marketplace-command",
      },
    ]);
  } catch (error) {
    return jsonMongoError(error, "Unable to complete marketplace command.");
  }
}
