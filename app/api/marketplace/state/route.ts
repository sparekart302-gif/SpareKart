import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { getMarketplaceStateSnapshotForRequest } from "@/server/marketplace/service";
import { appendServerTiming, measureAsync } from "@/server/performance";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { durationMs, result } = await measureAsync(
      "marketplace.state",
      () => getMarketplaceStateSnapshotForRequest(),
      {
        details: {
          route: "/api/marketplace/state",
        },
      },
    );
    const response = jsonSuccess(
      {
        state: result.state,
        authenticated: Boolean(result.sessionUser),
      },
      {
        message: "Marketplace state fetched successfully.",
      },
    );

    return appendServerTiming(response, [
      {
        name: "app",
        durationMs,
        description: "marketplace-state",
      },
    ]);
  } catch (error) {
    return jsonMongoError(error, "Unable to load marketplace state.");
  }
}
