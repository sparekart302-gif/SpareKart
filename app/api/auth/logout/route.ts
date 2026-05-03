import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { logoutCurrentSession } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST() {
  try {
    await logoutCurrentSession();
    return jsonSuccess(
      { loggedOut: true },
      {
        message: "Logged out successfully.",
        extra: {
          loggedOut: true,
        },
      },
    );
  } catch (error) {
    return jsonAuthError(error, "Logout failed.");
  }
}
