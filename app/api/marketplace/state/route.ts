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
        stale: result.stale,
        source: result.source,
      },
      {
        message: result.stale
          ? "Marketplace state fetched from the last available snapshot."
          : "Marketplace state fetched successfully.",
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
