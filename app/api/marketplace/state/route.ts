import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { getMarketplaceStateSnapshotForRequest } from "@/server/marketplace/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { state, sessionUser } = await getMarketplaceStateSnapshotForRequest();

    return jsonSuccess(
      {
        state,
        authenticated: Boolean(sessionUser),
      },
      {
        message: "Marketplace state fetched successfully.",
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to load marketplace state.");
  }
}
