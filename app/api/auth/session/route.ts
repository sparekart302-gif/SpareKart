import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { getCurrentSessionUser } from "@/server/auth/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    return jsonSuccess(
      { user },
      {
        message: user ? "Session loaded." : "No active session.",
        extra: {
          user,
        },
      },
    );
  } catch (error) {
    return jsonAuthError(error, "Unable to load the current session.");
  }
}
