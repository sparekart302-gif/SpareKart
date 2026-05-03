import type { NextRequest } from "next/server";
import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { resendVerificationEmail } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await resendVerificationEmail(body);
    return jsonSuccess(result, {
      message: result.alreadyVerified
        ? "This email address is already verified."
        : "A fresh verification code has been sent.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Unable to resend verification code.");
  }
}
