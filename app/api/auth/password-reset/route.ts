import type { NextRequest } from "next/server";
import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { requestPasswordReset } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await requestPasswordReset(body);
    return jsonSuccess(result, {
      message: "If the email exists, a password reset OTP has been sent.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Password reset request failed.");
  }
}
